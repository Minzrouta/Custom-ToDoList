// src/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true, // Derrière Traefik/Coolify — l'host vient du reverse proxy
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user }) {
      // Créer les workspaces par défaut au premier login
      if (user.id) {
        const existing = await prisma.workspaceMember.findFirst({
          where: { userId: user.id },
        });
        if (!existing) {
          const defaults = ["Boulot", "Ecole", "Perso"];
          for (const name of defaults) {
            const workspace = await prisma.workspace.create({
              data: { name },
            });
            await prisma.workspaceMember.create({
              data: {
                userId: user.id,
                workspaceId: workspace.id,
                role: "OWNER",
              },
            });
          }
        }
      }
      return true;
    },
    async session({ session, user }) {
      // Exposer l'ID utilisateur dans la session
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
