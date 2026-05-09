// src/app/api/workspaces/[id]/tasks/[taskId]/subtasks/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// POST /api/workspaces/[id]/tasks/[taskId]/subtasks — créer une sous-tâche
export async function POST(
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

    // Vérifier que la tâche appartient au workspace
    const task = await prisma.task.findUnique({ where: { id: taskId, workspaceId: id } });
    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const { title } = body;
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return Response.json({ error: "Le titre est requis" }, { status: 400 });
    }

    // Calculer l'ordre (ajouter à la fin)
    const count = await prisma.subTask.count({ where: { taskId } });

    const subtask = await prisma.subTask.create({
      data: { title: title.trim(), taskId, order: count },
    });

    return Response.json({ data: subtask }, { status: 201 });
  } catch (error) {
    console.error("[subtask:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
