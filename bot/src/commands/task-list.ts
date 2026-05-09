// bot/src/commands/task-list.ts
import type { ChatInputCommandInteraction } from "discord.js";
import { prisma } from "../prisma.js";
import { resolveContext, formatResolveError } from "../lib/resolve-context.js";
import { buildTaskListEmbed } from "../lib/embeds.js";

type Status = "todo" | "in_progress";
const VALID_LIST_STATUSES: Status[] = ["todo", "in_progress"];
const MAX_DISPLAYED = 10;

/**
 * Handler /task list — liste jusqu'à 10 tâches en cours du workspace lié.
 * Filtre optionnel par statut (todo / in_progress).
 */
export async function handleTaskList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const ctx = await resolveContext(interaction);
  if (!ctx.ok) {
    await interaction.editReply({ content: formatResolveError(ctx.error) });
    return;
  }

  const statusInput = interaction.options.getString("statut");
  const statusFilter: Status | null = VALID_LIST_STATUSES.includes(statusInput as Status)
    ? (statusInput as Status)
    : null;

  const where = statusFilter
    ? { workspaceId: ctx.ctx.workspace.id, status: statusFilter }
    : {
        workspaceId: ctx.ctx.workspace.id,
        status: { in: ["todo", "in_progress"] as const },
      };

  try {
    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: MAX_DISPLAYED,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          category: { select: { name: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    const embed = buildTaskListEmbed({
      workspaceId: ctx.ctx.workspace.id,
      workspaceName: ctx.ctx.workspace.name,
      tasks,
      totalCount,
    });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[task-list]", err);
    await interaction.editReply({ content: "Erreur lors du chargement des taches." });
  }
}
