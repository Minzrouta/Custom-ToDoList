// src/app/api/workspaces/[id]/categories/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// GET — liste des catégories du workspace
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

    const categories = await prisma.category.findMany({
      where: { workspaceId: id },
      orderBy: { name: "asc" },
    });

    return Response.json({ data: categories });
  } catch (error) {
    console.error("[categories:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST — créer une catégorie
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
    const { name, color } = body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Le nom est requis" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        color: color ?? "#6366f1",
        workspaceId: id,
      },
    });

    return Response.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("[categories:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
