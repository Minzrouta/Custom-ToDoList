// src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/[subId]/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// PATCH — toggle completed d'une sous-tâche
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string; subId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId, subId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Vérifier l'appartenance via la tâche
    const task = await prisma.task.findUnique({ where: { id: taskId, workspaceId: id } });
    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const { completed } = body;
    if (typeof completed !== "boolean") {
      return Response.json({ error: "Le champ 'completed' (boolean) est requis" }, { status: 400 });
    }

    const subtask = await prisma.subTask.update({
      where: { id: subId, taskId },
      data: { completed },
    });

    return Response.json({ data: subtask });
  } catch (error) {
    console.error("[subtask:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// DELETE — supprimer une sous-tâche
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; taskId: string; subId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id, taskId, subId } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId, workspaceId: id } });
    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    await prisma.subTask.delete({ where: { id: subId, taskId } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[subtask:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
