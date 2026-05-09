// bot/src/commands/index.ts
import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";

/**
 * Slash command unique /task avec 3 sous-commandes : add, list, done.
 * Les handlers sont des stubs ici — implémentation réelle en plan 04-02.
 */
export const taskCommand = new SlashCommandBuilder()
  .setName("task")
  .setDescription("Gérer les tâches du workspace lié à ce serveur Discord")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Créer une nouvelle tâche")
      .addStringOption((opt) =>
        opt.setName("titre").setDescription("Titre de la tâche").setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName("priorite")
          .setDescription("Priorité de la tâche")
          .addChoices(
            { name: "low", value: "low" },
            { name: "medium", value: "medium" },
            { name: "high", value: "high" },
            { name: "urgent", value: "urgent" },
          ),
      )
      .addStringOption((opt) =>
        opt.setName("categorie").setDescription("Nom d'une catégorie existante"),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Lister les tâches en cours")
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
      .setDescription("Marquer une tâche comme terminée")
      .addStringOption((opt) =>
        opt
          .setName("id")
          .setDescription("ID (ou préfixe) de la tâche")
          .setRequired(true),
      ),
  );

export const allCommands = [taskCommand];

/**
 * Dispatcher principal — appelé depuis index.ts sur chaque interaction.
 * En 04-01, retourne un message éphémère "Pas encore implémenté".
 * En 04-02, ce stub sera remplacé par les vrais handlers.
 */
export async function handleTaskInteraction(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const sub = interaction.options.getSubcommand();
  await interaction.reply({
    content: `[stub 04-01] /task ${sub} reçu — implémentation en plan 04-02.`,
    ephemeral: true,
  });
}
