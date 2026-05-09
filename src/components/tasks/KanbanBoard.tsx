// src/components/tasks/KanbanBoard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskCardData } from "@/components/tasks/TaskCard";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "À faire", color: "#6b7280" },
  { status: "in_progress", label: "En cours", color: "#f59e0b" },
  { status: "done", label: "Terminé", color: "#10b981" },
  { status: "cancelled", label: "Annulé", color: "#ef4444" },
];

type TasksByStatus = Record<TaskStatus, TaskCardData[]>;

interface KanbanBoardProps {
  workspaceId: string;
  initialTasks: TasksByStatus;
  onOpenTask: (task: TaskCardData | null) => void;
}

export function KanbanBoard({
  workspaceId,
  initialTasks,
  onOpenTask,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TasksByStatus>(initialTasks);
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const oldStatus = active.data.current?.status as TaskStatus;
    const newStatus = over.id as TaskStatus;

    if (oldStatus === newStatus) return;

    // Trouver la tâche
    const taskToMove = tasks[oldStatus]?.find((t) => t.id === taskId);
    if (!taskToMove) return;

    // Mise à jour optimiste immédiate
    const updatedTask = { ...taskToMove, status: newStatus };
    setTasks((prev) => ({
      ...prev,
      [oldStatus]: prev[oldStatus].filter((t) => t.id !== taskId),
      [newStatus]: [...(prev[newStatus] ?? []), updatedTask],
    }));

    // PATCH vers l'API
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        throw new Error(`PATCH failed: ${res.status}`);
      }

      // Synchroniser les données server
      router.refresh();
    } catch (error) {
      console.error("[kanban:drag]", error);
      // Rollback : restaurer l'état initial
      setTasks(initialTasks);
    }
  }

  const totalTasks = Object.values(tasks).reduce(
    (acc, col) => acc + col.length,
    0
  );

  return (
    <div>
      {/* Barre d'actions */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalTasks} tâche{totalTasks !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => onOpenTask(null)}
          className={cn(
            "px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700",
            "text-white font-medium transition-colors"
          )}
        >
          + Nouvelle tâche
        </button>
      </div>

      {/* Colonnes Kanban */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              color={col.color}
              tasks={tasks[col.status] ?? []}
              onTaskClick={onOpenTask}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
