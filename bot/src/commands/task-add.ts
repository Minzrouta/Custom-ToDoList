// bot/src/commands/task-add.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../prisma.js";
import { resolveContext, formatResolveError } from "../lib/resolve-context.js";
import { buildTaskActionEmbed } from "../lib/embeds.js";

type Priority = "low" | "medium" | "high" | "urgent";
const VALID_PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

/**
 * Handler /task add — crée une tâche dans le workspace lié au guild Discord.
 * Réponse : embed avec couleur basée sur la priorité.
 */
export async function handleTaskAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const ctx = await resolveContext(interaction);
  if (!ctx.ok) {
    await interaction.editReply({ content: formatResolveError(ctx.error) });
    return;
  }

  const title = interaction.options.getString("titre", true).trim();
  const priorityInput = interaction.options.getString("priorite");
  const categoryName = interaction.options.getString("categorie")?.trim();

  if (title.length === 0 || title.length > 200) {
    await interaction.editReply({
      content: "Le titre doit faire entre 1 et 200 caracteres.",
    });
    return;
  }

  const priority: Priority = VALID_PRIORITIES.includes(priorityInput as Priority)
    ? (priorityInput as Priority)
    : "medium";

  let categoryId: string | null = null;
  if (categoryName) {
    const cat = await prisma.category.findUnique({
      where: {
        name_workspaceId: { name: categoryName, workspaceId: ctx.ctx.workspace.id },
      },
      select: { id: true },
    });
    if (!cat) {
      await interaction.editReply({
        content: `Categorie "${categoryName}" introuvable dans ce workspace.`,
      });
      return;
    }
    categoryId = cat.id;
  }

  try {
    const created = await prisma.task.create({
      data: {
        title,
        priority,
        status: "todo",
        workspaceId: ctx.ctx.workspace.id,
        createdById: ctx.ctx.user.id,
        categoryId,
      },
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
      title: "Tache creee",
      task: created,
      workspaceId: ctx.ctx.workspace.id,
      workspaceName: ctx.ctx.workspace.name,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[task-add]", err);
    await interaction.editReply({ content: "Erreur lors de la creation de la tache." });
  }
}
