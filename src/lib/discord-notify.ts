// src/lib/discord-notify.ts
// Helper d'appel du bot Discord depuis l'app Next.js (réseau Docker interne).
// Best-effort : log l'erreur mais ne propage pas — une notification Discord ratée
// ne doit JAMAIS faire échouer une mutation de tâche.

const NOTIFY_URL =
  process.env.DISCORD_BOT_NOTIFY_URL ?? "http://discord-bot:8080/notify";
const NOTIFY_TIMEOUT_MS = 3000;

interface NotifyTaskShape {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "cancelled";
  category: { name: string } | null;
  dueDate: Date | string | null;
}

export interface NotifyDiscordInput {
  type: "task.created" | "task.completed";
  workspaceId: string;
  task: NotifyTaskShape;
  actor: { name: string | null };
}

export async function notifyDiscord(input: NotifyDiscordInput): Promise<void> {
  const payload = {
    type: input.type,
    workspaceId: input.workspaceId,
    task: {
      id: input.task.id,
      title: input.task.title,
      priority: input.task.priority,
      status: input.task.status,
      category: input.task.category,
      dueDate:
        input.task.dueDate === null
          ? null
          : typeof input.task.dueDate === "string"
            ? input.task.dueDate
            : input.task.dueDate.toISOString(),
    },
    actor: input.actor,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    const res = await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.text().catch(() => "");
      console.warn(`[discord-notify] ${res.status} ${body}`);
    }
  } catch (err) {
    // Best-effort : le bot peut etre down, le channel peut etre delie, peu importe
    console.warn(
      "[discord-notify] echec appel bot:",
      (err as Error).message,
    );
  } finally {
    clearTimeout(timeout);
  }
}
