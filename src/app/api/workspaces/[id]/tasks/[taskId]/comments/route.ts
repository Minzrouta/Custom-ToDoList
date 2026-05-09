// src/app/api/workspaces/[id]/tasks/[taskId]/comments/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// GET — liste des commentaires d'une tâche
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

    const task = await prisma.task.findUnique({ where: { id: taskId, workspaceId: id } });
    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({ data: comments });
  } catch (error) {
    console.error("[comments:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST — ajouter un commentaire
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

    const task = await prisma.task.findUnique({ where: { id: taskId, workspaceId: id } });
    if (!task) {
      return Response.json({ error: "Tâche introuvable" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = body;
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json({ error: "Le contenu est requis" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: { content: content.trim(), taskId, authorId: session.user.id },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    return Response.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("[comments:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
