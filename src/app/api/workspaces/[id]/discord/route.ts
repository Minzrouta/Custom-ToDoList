// src/app/api/workspaces/[id]/discord/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/auth-helpers";

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { discordGuildId, discordChannelId } = body as {
      discordGuildId?: string | null;
      discordChannelId?: string | null;
    };

    // Validation : si fourni et non vide, doit être un snowflake Discord (digits, 17-20 chars)
    if (
      discordGuildId != null &&
      discordGuildId !== "" &&
      !SNOWFLAKE_REGEX.test(discordGuildId)
    ) {
      return Response.json(
        { error: "Guild ID invalide (snowflake attendu)" },
        { status: 400 },
      );
    }
    if (
      discordChannelId != null &&
      discordChannelId !== "" &&
      !SNOWFLAKE_REGEX.test(discordChannelId)
    ) {
      return Response.json(
        { error: "Channel ID invalide (snowflake attendu)" },
        { status: 400 },
      );
    }

    // Vérifier l'unicité du guildId si fourni (un guild = un seul workspace)
    if (discordGuildId) {
      const conflict = await prisma.workspace.findUnique({
        where: { discordGuildId },
        select: { id: true },
      });
      if (conflict && conflict.id !== id) {
        return Response.json(
          { error: "Ce serveur Discord est déjà lié à un autre workspace" },
          { status: 409 },
        );
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        discordGuildId: discordGuildId === "" ? null : discordGuildId,
        discordChannelId: discordChannelId === "" ? null : discordChannelId,
      },
      select: { id: true, discordGuildId: true, discordChannelId: true },
    });

    return Response.json({ data: workspace });
  } catch (error) {
    console.error("[discord:PUT]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const member = await requireMembership(id, session.user.id);
    if (!member || member.role !== "OWNER") {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await prisma.workspace.update({
      where: { id },
      data: { discordGuildId: null, discordChannelId: null },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[discord:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
