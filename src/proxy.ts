// src/proxy.ts
// IMPORTANT: Next.js 16 — ce fichier remplace middleware.ts (déprécié)
// La fonction exportée DOIT s'appeler "proxy" (pas "middleware")
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Routes publiques — laisser passer sans authentification
  const publicPaths = ["/", "/auth/signin", "/api/auth"];
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Exclure les ressources statiques Next.js et les fichiers binaires
     * Appliquer le proxy à toutes les autres routes
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
