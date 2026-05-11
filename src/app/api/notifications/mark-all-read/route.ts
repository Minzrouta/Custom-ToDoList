// src/app/api/notifications/mark-all-read/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/notifications/mark-all-read — marque toutes les notifs de l'user comme lues
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return Response.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[notifs:mark-all-read]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
