// src/app/api/workspaces/[id]/tasks/[taskId]/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";
import { notifyDiscord } from "@/lib/discord-notify";
import { notifyAssignment, notifyCompletion } from "@/lib/notifications";

// GET /api/workspaces/[id]/tasks/[taskId] — détail complet
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId, workspaceId: id },
      // gitlabIssueIid + gitlabIssueUrl renvoyés implicitement (scalaires Task)
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        createdBy: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        subtasks: { orderBy: { order: "asc" } },
        comments: {
          include: { author: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    return Response.json({ data: task });
  } catch (error) {
    console.error("[task:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// PATCH /api/workspaces/[id]/tasks/[taskId] — mettre à jour une tâche
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, categoryId, assigneeId, tagIds } = body;

    // Vérifier que la tâche appartient bien au workspace + récupérer l'ancien statut
    const existing = await prisma.task.findUnique({
      where: { id: taskId, workspaceId: id },
      select: { id: true, status: true, assigneeId: true },
    });
    if (!existing) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description?.trim() ?? null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId ?? null } : {}),
        ...(assigneeId !== undefined ? { assigneeId: assigneeId ?? null } : {}),
        ...(tagIds !== undefined
          ? {
              tags: {
                deleteMany: {},
                create: (tagIds as string[]).map((tagId) => ({ tagId })),
              },
            }
          : {}),
      },
      // gitlabIssueIid + gitlabIssueUrl renvoyés implicitement (scalaires Task)
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        subtasks: { orderBy: { order: "asc" } },
        _count: { select: { comments: true } },
      },
    });

    // Fire-and-forget : si la tâche vient de passer à "done", notifier le bot Discord.
    const transitionedToDone = existing.status !== "done" && task.status === "done";
    if (transitionedToDone) {
      void notifyDiscord({
        type: "task.completed",
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
    }

    // Fire-and-forget : notifier le nouvel assignee si l'assignation a changé.
    if (task.assigneeId !== existing.assigneeId) {
      void notifyAssignment({
        taskId: task.id,
        taskTitle: task.title,
        workspaceId: id,
        oldAssigneeId: existing.assigneeId,
        newAssigneeId: task.assigneeId,
        actorId: session.user.id,
        actorName: session.user.name ?? null,
      });
    }

    // Fire-and-forget : si transition vers done, notifier l'assignee
    // (cas où quelqu'un d'autre que l'assignee a complété la tâche).
    if (transitionedToDone) {
      void notifyCompletion({
        taskId: task.id,
        taskTitle: task.title,
        workspaceId: id,
        assigneeId: task.assigneeId,
        actorId: session.user.id,
        actorName: session.user.name ?? null,
      });
    }

    return Response.json({ data: task });
  } catch (error) {
    console.error("[task:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/tasks/[taskId] — supprimer une tâche
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await prisma.task.delete({ where: { id: taskId, workspaceId: id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[task:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
