// bot/src/index.ts
import { Client, GatewayIntentBits, Events, Interaction } from "discord.js";
import { handleTaskInteraction } from "./commands/index.js";
import { startNotifyServer } from "./notify-server.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("[bot] DISCORD_TOKEN manquant dans l'environnement");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] Ready — connecté en tant que ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "task") return;

  try {
    await handleTaskInteraction(interaction);
  } catch (err) {
    console.error("[bot] Erreur dans le handler:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "Erreur interne", ephemeral: true });
    } else {
      await interaction.reply({ content: "Erreur interne", ephemeral: true });
    }
  }
});

// Démarrer le serveur HTTP /notify AVANT le login Discord
startNotifyServer(client);

client.login(token).catch((err) => {
  console.error("[bot] Login Discord échoué:", err);
  process.exit(1);
});
