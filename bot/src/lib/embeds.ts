// bot/src/lib/embeds.ts
import { EmbedBuilder } from "discord.js";

type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

const PRIORITY_COLORS: Record<Priority, number> = {
  urgent: 0xef4444, // rouge
  high: 0xf97316,   // orange
  medium: 0x3b82f6, // bleu
  low: 0x9ca3af,    // gris
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "A faire",
  in_progress: "En cours",
  done: "Terminee",
  cancelled: "Annulee",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://tasks.bantou.me";

interface TaskLike {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  category: { name: string } | null;
}

/**
 * Embed pour une action sur une tâche (création, completion).
 * Couleur basée sur la priorité — voir PRIORITY_COLORS.
 */
export function buildTaskActionEmbed(opts: {
  title: string;
  task: TaskLike;
  workspaceId: string;
  workspaceName: string;
}): EmbedBuilder {
  const { title, task, workspaceId, workspaceName } = opts;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**${task.title}**`)
    .setColor(PRIORITY_COLORS[task.priority])
    .addFields(
      { name: "Statut", value: STATUS_LABELS[task.status], inline: true },
      { name: "Priorite", value: task.priority, inline: true },
    )
    .setFooter({ text: `Workspace : ${workspaceName} - ${task.id.slice(0, 8)}` })
    .setURL(`${APP_URL}/workspace/${workspaceId}/list`);

  if (task.category) {
    embed.addFields({ name: "Categorie", value: task.category.name, inline: true });
  }
  if (task.dueDate) {
    embed.addFields({
      name: "Echeance",
      value: task.dueDate.toISOString().slice(0, 10),
      inline: true,
    });
  }

  return embed;
}

/**
 * Embed listant jusqu'à `tasks.length` tâches du workspace.
 * Le total `totalCount` permet d'afficher "N tâches de plus non affichées".
 */
export function buildTaskListEmbed(opts: {
  workspaceId: string;
  workspaceName: string;
  tasks: TaskLike[];
  totalCount: number;
}): EmbedBuilder {
  const { workspaceId, workspaceName, tasks, totalCount } = opts;

  if (tasks.length === 0) {
    return new EmbedBuilder()
      .setTitle(`Taches - ${workspaceName}`)
      .setDescription("Aucune tache en cours.")
      .setColor(0x6b7280)
      .setURL(`${APP_URL}/workspace/${workspaceId}/list`);
  }

  const lines = tasks.map((t) => {
    const idShort = t.id.slice(0, 8);
    const due = t.dueDate ? ` - ${t.dueDate.toISOString().slice(0, 10)}` : "";
    const cat = t.category ? ` [${t.category.name}]` : "";
    return `**\`${idShort}\`** ${t.title} - _${t.priority}_${cat}${due}`;
  });

  const description = lines.join("\n");
  const moreLine =
    totalCount > tasks.length
      ? `\n\n_${totalCount - tasks.length} tache(s) de plus non affichee(s) - voir l'app._`
      : "";

  return new EmbedBuilder()
    .setTitle(`Taches - ${workspaceName}`)
    .setDescription(description + moreLine)
    .setColor(0x3b82f6)
    .setFooter({ text: `${totalCount} tache(s) au total` })
    .setURL(`${APP_URL}/workspace/${workspaceId}/list`);
}
