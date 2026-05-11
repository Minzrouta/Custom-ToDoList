// src/app/api/workspaces/[id]/tasks/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";
import { notifyDiscord } from "@/lib/discord-notify";
import { notifyAssignment } from "@/lib/notifications";
import { TaskStatus, Priority } from "@prisma/client";

// GET /api/workspaces/[id]/tasks — liste avec filtres optionnels
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const priority = searchParams.get("priority") as Priority | null;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const tagId = searchParams.get("tagId") ?? undefined;
    const assigneeId = searchParams.get("assigneeId") ?? undefined;

    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: id,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(assigneeId ? { assigneeId } : {}),
        ...(tagId ? { tags: { some: { tagId } } } : {}),
      },
      // gitlabIssueIid + gitlabIssueUrl renvoyés implicitement (scalaires Task)
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        subtasks: { orderBy: { order: "asc" } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({ data: tasks });
  } catch (error) {
    console.error("[tasks:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/tasks — créer une tâche
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, categoryId, assigneeId, tagIds } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return Response.json({ error: "Le titre est requis" }, { status: 400 });
    }
    if (title.trim().length > 255) {
      return Response.json({ error: "Le titre ne peut pas dépasser 255 caractères" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? null,
        status: status ?? "todo",
        priority: priority ?? "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
        workspaceId: id,
        categoryId: categoryId ?? null,
        assigneeId: assigneeId ?? null,
        createdById: session.user.id,
        ...(tagIds && tagIds.length > 0
          ? { tags: { create: (tagIds as string[]).map((tagId) => ({ tagId })) } }
          : {}),
      },
      // gitlabIssueIid + gitlabIssueUrl renvoyés implicitement (scalaires Task)
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        subtasks: true,
        _count: { select: { comments: true } },
      },
    });

    // Fire-and-forget : notifier le bot Discord après création.
    // Ne PAS await — une notification ratée ne doit pas bloquer la réponse.
    void notifyDiscord({
      type: "task.created",
      workspaceId: id,
      task: {
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        category: task.category ? { name: task.category.name } : null,
        dueDate: task.dueDate,
      },
      actor: { name: session.user.name ?? null },
    });

    // Fire-and-forget : notifier le nouvel assignee si tâche assignée à la création.
    void notifyAssignment({
      taskId: task.id,
      taskTitle: task.title,
      workspaceId: id,
      oldAssigneeId: null,
      newAssigneeId: task.assigneeId,
      actorId: session.user.id,
      actorName: session.user.name ?? null,
    });

    return Response.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error("[tasks:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
