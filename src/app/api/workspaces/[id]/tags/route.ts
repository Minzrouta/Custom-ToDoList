// src/app/api/workspaces/[id]/tags/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// GET — liste des tags du workspace
export async function GET(
  _request: Request,
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

    const tags = await prisma.tag.findMany({
      where: { workspaceId: id },
      orderBy: { name: "asc" },
    });

    return Response.json({ data: tags });
  } catch (error) {
    console.error("[tags:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST — créer un tag
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
    const { name } = body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: { name: name.trim(), workspaceId: id },
    });

    return Response.json({ data: tag }, { status: 201 });
  } catch (error) {
    console.error("[tags:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
