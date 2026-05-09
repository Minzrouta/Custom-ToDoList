// src/lib/auth-helpers.ts
import { prisma } from "@/lib/prisma";

/**
 * Vérifie que l'utilisateur est membre du workspace.
 * Retourne le WorkspaceMember ou null si pas membre.
 * Utilisé par toutes les routes API sous /api/workspaces/[id]/.
 */
export async function requireMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}
