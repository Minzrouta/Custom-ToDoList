// bot/src/commands/index.ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { handleTaskAdd } from "./task-add.js";
import { handleTaskList } from "./task-list.js";
import { handleTaskDone } from "./task-done.js";

/**
 * Slash command unique /task avec 3 sous-commandes : add, list, done.
 * Les définitions ci-dessous sont publiées vers Discord via register.ts ;
 * ne PAS modifier les noms/required sans re-register.
 */
export const taskCommand = new SlashCommandBuilder()
  .setName("task")
  .setDescription("Gerer les taches du workspace lie a ce serveur Discord")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Creer une nouvelle tache")
      .addStringOption((opt) =>
        opt.setName("titre").setDescription("Titre de la tache").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("priorite")
          .setDescription("Priorite de la tache")
          .addChoices(
            { name: "low", value: "low" },
            { name: "medium", value: "medium" },
            { name: "high", value: "high" },
            { name: "urgent", value: "urgent" },
          ),
      )
      .addStringOption((opt) =>
        opt.setName("categorie").setDescription("Nom d'une categorie existante"),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Lister les taches en cours")
      .addStringOption((opt) =>
        opt
          .setName("statut")
          .setDescription("Filtrer par statut")
          .addChoices(
            { name: "todo", value: "todo" },
            { name: "in_progress", value: "in_progress" },
          ),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("done")
      .setDescription("Marquer une tache comme terminee")
      .addStringOption((opt) =>
        opt
          .setName("id")
          .setDescription("ID (ou prefixe) de la tache")
          .setRequired(true),
      ),
  );

export const allCommands = [taskCommand];

/**
 * Dispatcher principal — appelé depuis index.ts sur chaque interaction /task.
 * Route vers le bon handler selon la sous-commande.
 */
export async function handleTaskInteraction(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case "add":
      return handleTaskAdd(interaction);
    case "list":
      return handleTaskList(interaction);
    case "done":
      return handleTaskDone(interaction);
    default:
      await interaction.reply({
        content: `Sous-commande inconnue : ${sub}`,
        ephemeral: true,
      });
  }
}
