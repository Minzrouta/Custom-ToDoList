// src/app/api/users/me/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/users/me — met à jour name + image du user courant
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, image } = body as { name?: string | null; image?: string | null };

    const data: { name?: string | null; image?: string | null } = {};

    if (name !== undefined) {
      if (name !== null && (typeof name !== "string" || name.trim().length === 0)) {
        return Response.json({ error: "Le nom ne peut pas être vide" }, { status: 400 });
      }
      if (typeof name === "string" && name.trim().length > 100) {
        return Response.json(
          { error: "Le nom ne peut pas dépasser 100 caractères" },
          { status: 400 },
        );
      }
      data.name = typeof name === "string" ? name.trim() : null;
    }

    if (image !== undefined) {
      if (image !== null && typeof image !== "string") {
        return Response.json({ error: "Image invalide" }, { status: 400 });
      }
      if (typeof image === "string" && image.trim().length > 0) {
        // Validation simple : URL http(s)
        try {
          const url = new URL(image.trim());
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return Response.json(
              { error: "L'URL de l'avatar doit être http(s)" },
              { status: 400 },
            );
          }
        } catch {
          return Response.json({ error: "URL d'avatar invalide" }, { status: 400 });
        }
        data.image = image.trim();
      } else {
        data.image = null;
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, email: true, image: true },
    });

    return Response.json({ data: user });
  } catch (error) {
    console.error("[users/me:PATCH]", error);
    return Response.json({ error: "Erreur interne" }, { status: 500 });
  }
}
