// src/app/api/workspaces/[id]/members/route.ts
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/workspaces/[id]/members — lister les membres du workspace
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

    // Vérifier que l'user est membre avant d'exposer la liste
    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    });
    if (!self) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return Response.json({ data: members });
  } catch (error) {
    console.error("[members:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/members — inviter un utilisateur par email (OWNER uniquement)
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

    // Seul l'OWNER peut inviter
    const self = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    });
    if (!self || self.role !== "OWNER") {
      return Response.json(
        { error: "Accès refusé — OWNER requis pour inviter" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Email invalide" }, { status: 400 });
    }

    // Trouver l'utilisateur invité (doit déjà avoir un compte)
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!targetUser) {
      return Response.json(
        {
          error:
            "Aucun compte trouvé pour cet email. L'utilisateur doit se connecter une première fois.",
        },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: targetUser.id, workspaceId: id } },
    });
    if (alreadyMember) {
      return Response.json(
        { error: "Cet utilisateur est déjà membre du workspace" },
        { status: 409 }
      );
    }

    const member = await prisma.workspaceMember.create({
      data: { userId: targetUser.id, workspaceId: id, role: "MEMBER" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return Response.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("[members:POST]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
