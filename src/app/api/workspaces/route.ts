// src/app/api/workspaces/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/workspaces — lister les workspaces de l'utilisateur connecté
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: true,
      },
      orderBy: { joinedAt: "asc" },
    });
    return Response.json({
      data: memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
    });
  } catch (error) {
    console.error("[workspaces:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST /api/workspaces — créer un workspace
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json(
        { error: "Le nom du workspace est requis" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return Response.json(
        { error: "Le nom ne peut pas dépasser 100 caractères" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });
    return Response.json({ data: { ...workspace, role: "OWNER" } }, { status: 201 });
  } catch (error) {
    console.error("[workspaces:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
