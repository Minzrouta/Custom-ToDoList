// bot/src/notify-server.ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Client } from "discord.js";

/**
 * Serveur HTTP interne (réseau Docker) — l'app Next.js POST /notify pour
 * envoyer un message dans un channel Discord configuré.
 * Port 8080 NON exposé publiquement (pas de port mapping dans compose).
 *
 * En 04-01 : reçoit la requête, log, répond 202 Accepted (stub).
 * En 04-03 : route vers le bon channel et envoie un embed.
 */
export function startNotifyServer(client: Client): void {
  const port = Number(process.env.NOTIFY_PORT ?? 8080);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "POST" && req.url === "/notify") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          console.log("[notify] payload reçu:", payload);
          // Implémentation réelle en 04-03 — pour l'instant on accepte sans agir
          void client; // évite warning unused — sera utilisé en 04-03
          res.writeHead(202, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "accepted" }));
        } catch (err) {
          console.error("[notify] payload invalide:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", botReady: client.isReady() }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[notify] Server listening on :${port}`);
  });
}
