// src/app/api/workspaces/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireMembership } from "@/lib/auth-helpers";

// GET /api/workspaces/[id] — détail d'un workspace
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

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (!workspace) {
      return Response.json({ error: "Workspace introuvable" }, { status: 404 });
    }

    return Response.json({ data: { ...workspace, role: member.role } });
  } catch (error) {
    console.error("[workspace:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// PATCH /api/workspaces/[id] — renommer un workspace (OWNER uniquement)
export async function PATCH(
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
    if (!member || member.role !== "OWNER") {
      return Response.json(
        { error: "Accès refusé — OWNER requis" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return Response.json({ error: "Le nom est requis" }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return Response.json(
        { error: "Le nom ne peut pas dépasser 100 caractères" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name: name.trim() },
    });

    return Response.json({ data: { ...workspace, role: member.role } });
  } catch (error) {
    console.error("[workspace:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id] — supprimer un workspace (OWNER uniquement)
export async function DELETE(
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
    if (!member || member.role !== "OWNER") {
      return Response.json(
        { error: "Accès refusé — OWNER requis" },
        { status: 403 }
      );
    }

    await prisma.workspace.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[workspace:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
