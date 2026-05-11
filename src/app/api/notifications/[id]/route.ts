// src/app/api/notifications/[id]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/notifications/[id] — marque une notif comme lue
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Vérifier que la notif appartient bien à l'user (sécurité)
    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true, readAt: true },
    });
    if (!existing) {
      return Response.json(
        { error: "Notification introuvable" },
        { status: 404 },
      );
    }
    if (existing.userId !== session.user.id) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Idempotent : si déjà lue, on renvoie le record actuel sans update
    if (existing.readAt) {
      const notif = await prisma.notification.findUnique({ where: { id } });
      return Response.json({ data: notif });
    }

    const notif = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return Response.json({ data: notif });
  } catch (error) {
    console.error("[notif:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
