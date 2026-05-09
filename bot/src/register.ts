// bot/src/register.ts
// Usage : npm run register
//   - Si DISCORD_GUILD_ID est défini, enregistre dans ce guild (instantané, pour dev)
//   - Sinon enregistre globalement (peut prendre jusqu'à 1h pour propager)
import { REST, Routes } from "discord.js";
import { allCommands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("[register] DISCORD_TOKEN et DISCORD_CLIENT_ID requis");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
const body = allCommands.map((c) => c.toJSON());

(async () => {
  try {
    if (guildId) {
      console.log(`[register] Enregistrement guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log("[register] Commandes enregistrées dans le guild.");
    } else {
      console.log("[register] Enregistrement global...");
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log("[register] Commandes enregistrées globalement (propagation jusqu'à 1h).");
    }
  } catch (err) {
    console.error("[register] Erreur:", err);
    process.exit(1);
  }
})();
