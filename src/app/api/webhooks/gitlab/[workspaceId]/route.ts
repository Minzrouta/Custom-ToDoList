// src/app/api/webhooks/gitlab/[workspaceId]/route.ts
// Endpoint webhook GitLab — point d'entrée unique des événements GitLab.
// Auth via X-Gitlab-Token UNIQUEMENT (pas de session NextAuth).
// FR-08 (intégration GitLab) + NFR-02 (sécurité, comparaison constant-time).

import { prisma } from "@/lib/prisma";
import { notifyDiscord } from "@/lib/discord-notify";
import { timingSafeEqual } from "node:crypto";
import type { Priority, TaskStatus } from "@prisma/client";

const PRIORITY_LABELS = new Set(["low", "medium", "high", "urgent"]);

// --- Types locaux pour le payload GitLab Issue webhook ---
interface GitLabLabel {
  title: string;
}
interface GitLabAssignee {
  name?: string;
  username?: string;
  email?: string;
}
interface GitLabIssueAttrs {
  iid: number;
  title: string;
  description?: string | null;
  state?: string;
  action?: "open" | "close" | "reopen" | "update";
  url?: string;
  labels?: GitLabLabel[];
}
interface GitLabIssueWebhookPayload {
  object_kind: string;
  event_type?: string;
  user?: { id: number; name?: string; username?: string; email?: string };
  project?: { id: number; path_with_namespace?: string; web_url?: string };
  object_attributes?: GitLabIssueAttrs;
  labels?: GitLabLabel[];
  assignees?: GitLabAssignee[];
}

/**
 * Comparaison constant-time des tokens.
 * timingSafeEqual exige des Buffers de même longueur — sinon on simule
 * une comparaison fictive pour garder un coût constant et on retourne false.
 */
function tokensEqual(received: string, expected: string): boolean {
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;

    // 1. Charger le workspace + son secret
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        gitlabWebhookSecret: true,
        discordChannelId: true,
      },
    });
    if (!workspace || !workspace.gitlabWebhookSecret) {
      console.warn(
        `[gitlab-webhook] workspace ${workspaceId} sans secret configuré`,
      );
      return Response.json(
        { error: "Webhook non configuré" },
        { status: 401 },
      );
    }

    // 2. Valider X-Gitlab-Token (constant-time)
    const receivedToken = request.headers.get("x-gitlab-token") ?? "";
    if (
      !receivedToken ||
      !tokensEqual(receivedToken, workspace.gitlabWebhookSecret)
    ) {
      console.warn(
        `[gitlab-webhook] token invalide pour workspace ${workspaceId}`,
      );
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    // 3. Parser le body
    const rawBody = await request.text();
    let payload: GitLabIssueWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as GitLabIssueWebhookPayload;
    } catch {
      return Response.json({ error: "JSON invalide" }, { status: 400 });
    }

    // 4. Filter : on ne gère que les issues v1
    if (payload.object_kind !== "issue") {
      return Response.json({ ok: true, skipped: "not an issue event" });
    }

    const attrs = payload.object_attributes;
    if (!attrs || typeof attrs.iid !== "number") {
      return Response.json(
        { error: "object_attributes manquants" },
        { status: 400 },
      );
    }

    // 5. Router selon action
    const action = attrs.action;

    // OPEN → idempotent create
    if (action === "open") {
      const existing = await prisma.task.findFirst({
        where: { workspaceId, gitlabIssueIid: attrs.iid },
        select: { id: true },
      });
      if (existing) {
        return Response.json({
          ok: true,
          skipped: "already exists",
          taskId: existing.id,
        });
      }

      // createdById = OWNER du workspace (user "système" pour les tâches webhook)
      const owner = await prisma.workspaceMember.findFirst({
        where: { workspaceId, role: "OWNER" },
        select: { userId: true },
      });
      if (!owner) {
        return Response.json(
          { error: "Workspace sans OWNER" },
          { status: 500 },
        );
      }

      // Labels GitLab → priority + tags
      const labelTitles = (payload.labels ?? attrs.labels ?? []).map(
        (l) => l.title,
      );
      const priorityFromLabels = labelTitles.find((t) =>
        PRIORITY_LABELS.has(t.toLowerCase()),
      );
      const priority: Priority =
        (priorityFromLabels?.toLowerCase() as Priority | undefined) ?? "medium";
      const nonPriorityLabels = labelTitles.filter(
        (t) => !PRIORITY_LABELS.has(t.toLowerCase()),
      );

      // Upsert tags un par un (respecte @@unique([name, workspaceId]))
      const tagIds: string[] = [];
      for (const labelName of nonPriorityLabels) {
        const tag = await prisma.tag.upsert({
          where: { name_workspaceId: { name: labelName, workspaceId } },
          create: { name: labelName, workspaceId },
          update: {},
          select: { id: true },
        });
        tagIds.push(tag.id);
      }

      // Assignee best-effort (match par email + must be member)
      const assigneeEmail = payload.assignees?.[0]?.email;
      let assigneeId: string | null = null;
      if (assigneeEmail) {
        const member = await prisma.user.findUnique({
          where: { email: assigneeEmail },
          select: { id: true },
        });
        if (member) {
          const isMember = await prisma.workspaceMember.findUnique({
            where: {
              userId_workspaceId: { userId: member.id, workspaceId },
            },
            select: { id: true },
          });
          if (isMember) assigneeId = member.id;
        }
      }

      const task = await prisma.task.create({
        data: {
          title: attrs.title.slice(0, 255),
          description: attrs.description ?? null,
          status: "todo",
          priority,
          workspaceId,
          createdById: owner.userId,
          assigneeId,
          gitlabIssueIid: attrs.iid,
          gitlabIssueUrl: attrs.url ?? null,
          ...(tagIds.length > 0
            ? { tags: { create: tagIds.map((tagId) => ({ tagId })) } }
            : {}),
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          tags: { include: { tag: { select: { id: true, name: true } } } },
        },
      });

      // Fire-and-forget : notification Discord (NE PAS await)
      void notifyDiscord({
        type: "task.created",
        workspaceId,
        task: {
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          category: task.category ? { name: task.category.name } : null,
          dueDate: task.dueDate,
        },
        actor: { name: payload.user?.name ?? "GitLab" },
      });

      return Response.json(
        { ok: true, taskId: task.id, action: "created" },
        { status: 201 },
      );
    }

    // CLOSE → marque la tâche existante comme done
    if (action === "close") {
      const existing = await prisma.task.findFirst({
        where: { workspaceId, gitlabIssueIid: attrs.iid },
        select: { id: true, status: true },
      });
      if (!existing) {
        return Response.json({ ok: true, skipped: "task not found" });
      }
      if (existing.status === "done") {
        return Response.json({ ok: true, skipped: "already done" });
      }
      await prisma.task.update({
        where: { id: existing.id },
        data: { status: "done" satisfies TaskStatus },
      });
      return Response.json({
        ok: true,
        taskId: existing.id,
        action: "closed",
      });
    }

    // REOPEN → marque comme todo
    if (action === "reopen") {
      const existing = await prisma.task.findFirst({
        where: { workspaceId, gitlabIssueIid: attrs.iid },
        select: { id: true },
      });
      if (!existing) {
        return Response.json({ ok: true, skipped: "task not found" });
      }
      await prisma.task.update({
        where: { id: existing.id },
        data: { status: "todo" satisfies TaskStatus },
      });
      return Response.json({
        ok: true,
        taskId: existing.id,
        action: "reopened",
      });
    }

    // UPDATE et autres : déféré v2
    return Response.json({
      ok: true,
      skipped: `action ${action ?? "unknown"} not handled v1`,
    });
  } catch (error) {
    console.error("[gitlab-webhook:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
