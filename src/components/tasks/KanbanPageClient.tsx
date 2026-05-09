// src/components/tasks/KanbanPageClient.tsx
// Wrapper client pour la page Kanban — plan 04 injectera le TaskModal ici
"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskCardData } from "@/components/tasks/TaskCard";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

interface KanbanPageClientProps {
  workspaceId: string;
  initialTasks: Record<TaskStatus, TaskCardData[]>;
}

export function KanbanPageClient({
  workspaceId,
  initialTasks,
}: KanbanPageClientProps) {
  const [selectedTask, setSelectedTask] = useState<
    TaskCardData | null | undefined
  >(undefined);

  return (
    <>
      <KanbanBoard
        workspaceId={workspaceId}
        initialTasks={initialTasks}
        onOpenTask={(task) => setSelectedTask(task ?? null)}
      />
      {/* TaskModal sera ajouté ici en plan 04 */}
    </>
  );
}
