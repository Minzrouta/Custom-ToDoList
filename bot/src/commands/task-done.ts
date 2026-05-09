// bot/src/commands/task-done.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../prisma.js";
import { resolveContext, formatResolveError } from "../lib/resolve-context.js";
import { buildTaskActionEmbed } from "../lib/embeds.js";

/**
 * Handler /task done — marque une tâche du workspace lié comme terminée.
 * L'argument id accepte un préfixe court (8 chars) via Prisma startsWith.
 * Si plusieurs tâches matchent, l'utilisateur doit préciser l'ID.
 */
export async function handleTaskDone(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const ctx = await resolveContext(interaction);
  if (!ctx.ok) {
    await interaction.editReply({ content: formatResolveError(ctx.error) });
    return;
  }

  const idInput = interaction.options.getString("id", true).trim();

  if (idInput.length < 4) {
    await interaction.editReply({
      content: "L'ID fourni est trop court (minimum 4 caracteres).",
    });
    return;
  }

  try {
    const matches = await prisma.task.findMany({
      where: {
        workspaceId: ctx.ctx.workspace.id,
        id: { startsWith: idInput },
      },
      take: 2,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        category: { select: { name: true } },
      },
    });

    if (matches.length === 0) {
      await interaction.editReply({
        content: `Aucune tache dont l'ID commence par \`${idInput}\` dans ce workspace.`,
      });
      return;
    }

    if (matches.length > 1) {
      await interaction.editReply({
        content: `Plusieurs taches correspondent a \`${idInput}\`. Precisez l'ID (8+ caracteres).`,
      });
      return;
    }

    const target = matches[0];
    if (target.status === "done") {
      await interaction.editReply({
        content: `La tache **${target.title}** est deja marquee comme terminee.`,
      });
      return;
    }

    const updated = await prisma.task.update({
      where: { id: target.id },
      data: { status: "done" },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        category: { select: { name: true } },
      },
    });

    const embed = buildTaskActionEmbed({
      title: "Tache terminee",
      task: updated,
      workspaceId: ctx.ctx.workspace.id,
      workspaceName: ctx.ctx.workspace.name,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[task-done]", err);
    await interaction.editReply({ content: "Erreur lors de la mise a jour." });
  }
}
