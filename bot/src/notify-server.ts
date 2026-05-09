// bot/src/notify-server.ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Client } from "discord.js";
import { prisma } from "./prisma.js";
import { buildTaskActionEmbed } from "./lib/embeds.js";

/**
 * Serveur HTTP interne (réseau Docker) — l'app Next.js POST /notify pour
 * envoyer un message dans un channel Discord configuré.
 * Port 8080 NON exposé publiquement (pas de port mapping dans compose).
 */

interface NotifyTask {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "cancelled";
  category: { name: string } | null;
  dueDate: string | null;
}

interface NotifyPayload {
  type: "task.created" | "task.completed";
  workspaceId: string;
  task: NotifyTask;
  actor: { name: string | null };
}

function isValidPayload(data: unknown): data is NotifyPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.type !== "task.created" && d.type !== "task.completed") return false;
  if (typeof d.workspaceId !== "string") return false;
  if (!d.task || typeof d.task !== "object") return false;
  const t = d.task as Record<string, unknown>;
  return typeof t.id === "string" && typeof t.title === "string";
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function dispatchNotification(
  client: Client,
  payload: NotifyPayload,
): Promise<{ status: number; body: unknown }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: payload.workspaceId },
    select: { id: true, name: true, discordChannelId: true },
  });

  if (!workspace) {
    return { status: 404, body: { error: "Workspace introuvable" } };
  }

  if (!workspace.discordChannelId) {
    console.log(`[notify] workspace ${workspace.id} sans channel Discord — skip`);
    return { status: 204, body: null };
  }

  let channel: Awaited<ReturnType<Client["channels"]["fetch"]>> | null = null;
  try {
    channel = await client.channels.fetch(workspace.discordChannelId);
  } catch (err) {
    console.error(
      `[notify] impossible de fetch le channel ${workspace.discordChannelId}:`,
      err,
    );
    return { status: 502, body: { error: "Channel inaccessible" } };
  }

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    return { status: 422, body: { error: "Channel non textuel ou inaccessible" } };
  }

  const taskWithDate = {
    ...payload.task,
    dueDate: payload.task.dueDate ? new Date(payload.task.dueDate) : null,
  };

  const titleByType: Record<NotifyPayload["type"], string> = {
    "task.created": "Nouvelle tache",
    "task.completed": "Tache terminee",
  };

  const embed = buildTaskActionEmbed({
    title: titleByType[payload.type],
    task: taskWithDate,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  });

  const actorLine = payload.actor.name ? `Par : ${payload.actor.name}` : undefined;

  await channel.send({
    content: actorLine,
    embeds: [embed],
  });

  return { status: 200, body: { status: "sent" } };
}

export function startNotifyServer(client: Client): void {
  const port = Number(process.env.NOTIFY_PORT ?? 8080);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", botReady: client.isReady() }));
      return;
    }

    if (req.method === "POST" && req.url === "/notify") {
      try {
        const data = await readJson(req);
        if (!isValidPayload(data)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Payload invalide" }));
          return;
        }

        if (!client.isReady()) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Bot non pret" }));
          return;
        }

        const { status, body } = await dispatchNotification(client, data);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(body === null ? "" : JSON.stringify(body));
      } catch (err) {
        console.error("[notify] erreur dispatch:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Erreur interne" }));
      }
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[notify] Server listening on :${port}`);
  });
}
