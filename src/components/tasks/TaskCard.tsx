// src/components/tasks/TaskCard.tsx
"use client";

import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

export interface TaskCardData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | string | null;
  category: { id?: string; name: string; color: string } | null;
  assignee: { id?: string; name: string | null; image: string | null } | null;
  tags: { tag: { id: string; name: string } }[];
  subtasks: { completed: boolean }[];
  _count: { comments: number };
  gitlabIssueIid: number | null;
  gitlabIssueUrl: string | null;
}

interface TaskCardProps {
  task: TaskCardData;
  onClick: () => void;
}

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Faible",
  medium: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
  cancelled: "Annulé",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  low: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  medium: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  high: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  urgent: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
};

const STATUS_CLASSES: Record<TaskStatus, string> = {
  todo: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  in_progress: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  done: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  cancelled: "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 line-through",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    task.status !== "cancelled" &&
    new Date(task.dueDate) < new Date();

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const formatDate = (d: Date | string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200",
        "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
        "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
        task.priority === "urgent" && "border-l-4 border-l-red-500",
        task.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Ligne 1 : titre + badges priorité/statut */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={cn(
            "text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug",
            task.status === "cancelled" && "line-through text-gray-400 dark:text-gray-500"
          )}
        >
          {task.title}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_CLASSES[task.priority])}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CLASSES[task.status])}>
            {STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>

      {/* Ligne 2 : catégorie + tags + badge GitLab */}
      {(task.category || task.tags.length > 0 || task.gitlabIssueUrl) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: task.category.color }}
            >
              {task.category.name}
            </span>
          )}
          {task.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              #{tag.name}
            </span>
          ))}
          {task.gitlabIssueUrl && (
            <a
              href={task.gitlabIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors inline-flex items-center gap-1"
              title="Ouvrir l'issue GitLab"
            >
              <span aria-hidden="true">🦊</span>
              GitLab #{task.gitlabIssueIid ?? "?"}
            </a>
          )}
        </div>
      )}

      {/* Ligne 3 : due date + sous-tâches + commentaires + assignee */}
      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.dueDate && (
            <span className={cn(isOverdue && "text-red-600 dark:text-red-400 font-medium")}>
              {isOverdue ? "! " : ""}
              {formatDate(task.dueDate)}
            </span>
          )}
          {totalSubtasks > 0 && (
            <span>
              {completedSubtasks}/{totalSubtasks} sous-tâches
            </span>
          )}
          {task._count.comments > 0 && (
            <span>{task._count.comments} commentaire{task._count.comments > 1 ? "s" : ""}</span>
          )}
        </div>
        {task.assignee && (
          <div className="flex items-center gap-1">
            {task.assignee.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={task.assignee.image}
                alt={task.assignee.name ?? "Assigné"}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                {(task.assignee.name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
