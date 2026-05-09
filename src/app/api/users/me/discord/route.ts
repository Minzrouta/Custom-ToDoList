// src/app/api/users/me/discord/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { discordId } = body as { discordId?: string };

    if (!discordId || !SNOWFLAKE_REGEX.test(discordId)) {
      return Response.json(
        { error: "Discord ID invalide (snowflake attendu)" },
        { status: 400 },
      );
    }

    // Conflit : un autre user a déjà ce discordId
    const conflict = await prisma.user.findUnique({
      where: { discordId },
      select: { id: true },
    });
    if (conflict && conflict.id !== session.user.id) {
      return Response.json(
        { error: "Ce Discord ID est déjà lié à un autre compte" },
        { status: 409 },
      );
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { discordId },
      select: { id: true, discordId: true },
    });

    return Response.json({ data: user });
  } catch (error) {
    console.error("[user-discord:PUT]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { discordId: null },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[user-discord:DELETE]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
