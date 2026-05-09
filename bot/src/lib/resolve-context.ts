// bot/src/lib/resolve-context.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../prisma.js";

export interface ResolvedContext {
  workspace: { id: string; name: string; discordChannelId: string | null };
  user: { id: string; name: string | null };
}

export type ResolveError =
  | { kind: "no-guild" }
  | { kind: "guild-not-linked"; guildId: string }
  | { kind: "user-not-linked"; discordUserId: string };

export type ResolveResult =
  | { ok: true; ctx: ResolvedContext }
  | { ok: false; error: ResolveError };

/**
 * Résout le contexte d'une interaction Discord :
 *   - guild Discord -> Workspace (via Workspace.discordGuildId)
 *   - user Discord  -> User app  (via User.discordId)
 *
 * Toutes les commandes /task DOIVENT passer par cette résolution avant
 * tout accès Prisma : c'est elle qui garantit l'isolation par workspaceId.
 */
export async function resolveContext(
  interaction: ChatInputCommandInteraction,
): Promise<ResolveResult> {
  if (!interaction.guildId) {
    return { ok: false, error: { kind: "no-guild" } };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { discordGuildId: interaction.guildId },
    select: { id: true, name: true, discordChannelId: true },
  });

  if (!workspace) {
    return {
      ok: false,
      error: { kind: "guild-not-linked", guildId: interaction.guildId },
    };
  }

  const user = await prisma.user.findUnique({
    where: { discordId: interaction.user.id },
    select: { id: true, name: true },
  });

  if (!user) {
    return {
      ok: false,
      error: { kind: "user-not-linked", discordUserId: interaction.user.id },
    };
  }

  return { ok: true, ctx: { workspace, user } };
}

/**
 * Formate un ResolveError en message utilisateur (FR) — utilisé pour
 * `interaction.editReply({ content })` côté handlers.
 */
export function formatResolveError(error: ResolveError): string {
  switch (error.kind) {
    case "no-guild":
      return "Cette commande doit etre utilisee dans un serveur Discord, pas en message prive.";
    case "guild-not-linked":
      return (
        "Ce serveur Discord n'est lie a aucun workspace. " +
        "Configurez-le depuis les parametres du workspace dans l'application."
      );
    case "user-not-linked":
      return (
        "Votre compte Discord n'est pas lie a un compte de l'application. " +
        `Renseignez votre Discord ID (\`${error.discordUserId}\`) ` +
        "dans les parametres de votre profil dans l'application."
      );
  }
}
