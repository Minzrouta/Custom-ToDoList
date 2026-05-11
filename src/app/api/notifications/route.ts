// src/app/api/notifications/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications?unread=true&limit=20
// Retourne les notifs de l'user authentifié, triées DESC par createdAt.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 && limitRaw <= 100
        ? limitRaw
        : 20;

    const where = {
      userId: session.user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    };

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          task: { select: { id: true, title: true, workspaceId: true } },
          workspace: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, readAt: null },
      }),
    ]);

    return Response.json({ data: { items, unreadCount } });
  } catch (error) {
    console.error("[notifs:GET]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
