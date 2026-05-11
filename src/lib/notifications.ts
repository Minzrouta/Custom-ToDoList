// src/lib/notifications.ts
// Helpers de génération de notifications in-app.
// Best-effort : log les erreurs mais ne propage jamais — une notif ratée
// ne doit JAMAIS faire échouer une mutation de tâche.

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  taskId?: string | null;
  workspaceId?: string | null;
}

/**
 * Crée une notification en DB. Best-effort : log + swallow toute erreur.
 * À appeler en fire-and-forget : `void createNotification({...})`.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        taskId: input.taskId ?? null,
        workspaceId: input.workspaceId ?? null,
      },
    });
  } catch (err) {
    console.warn(
      "[notifications:create] échec création notif:",
      (err as Error).message,
    );
  }
}

interface NotifyAssignmentInput {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  oldAssigneeId: string | null;
  newAssigneeId: string | null;
  actorId: string;
  actorName: string | null;
}

/**
 * Notifie le nouvel assignee qu'une tâche lui a été assignée.
 * No-op si :
 *  - newAssigneeId est null (désassignation)
 *  - newAssigneeId === oldAssigneeId (pas de changement)
 *  - newAssigneeId === actorId (l'user s'auto-assigne, pas de notif inutile)
 */
export async function notifyAssignment(
  input: NotifyAssignmentInput,
): Promise<void> {
  if (!input.newAssigneeId) return;
  if (input.newAssigneeId === input.oldAssigneeId) return;
  if (input.newAssigneeId === input.actorId) return;

  const actor = input.actorName ?? "Quelqu'un";
  await createNotification({
    userId: input.newAssigneeId,
    type: "task_assigned",
    title: `${actor} vous a assigné une tâche`,
    body: input.taskTitle,
    taskId: input.taskId,
    workspaceId: input.workspaceId,
  });
}

interface NotifyCompletionInput {
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  assigneeId: string | null;
  actorId: string;
  actorName: string | null;
}

/**
 * Notifie l'assignee qu'une tâche qui lui était assignée a été complétée
 * par quelqu'un d'autre. No-op si :
 *  - assigneeId est null (tâche non assignée)
 *  - assigneeId === actorId (l'assignee a complété sa propre tâche)
 */
export async function notifyCompletion(
  input: NotifyCompletionInput,
): Promise<void> {
  if (!input.assigneeId) return;
  if (input.assigneeId === input.actorId) return;

  const actor = input.actorName ?? "Quelqu'un";
  await createNotification({
    userId: input.assigneeId,
    type: "task_completed",
    title: `${actor} a terminé une tâche qui vous était assignée`,
    body: input.taskTitle,
    taskId: input.taskId,
    workspaceId: input.workspaceId,
  });
}
