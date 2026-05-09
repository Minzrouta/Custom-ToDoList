// src/app/api/health/route.ts
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Vérifier la connectivité DB avec une requête légère
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        db: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    // Log l'erreur complète côté serveur uniquement (T-01-04: ne pas exposer les détails)
    console.error("[health] DB connection failed:", error);

    return Response.json(
      {
        status: "error",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
