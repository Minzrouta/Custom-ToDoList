// src/components/tasks/KanbanColumn.tsx
"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { TaskCard, TaskCardData } from "@/components/tasks/TaskCard";

// Wrapper draggable pour chaque TaskCard
function DraggableTaskCard({
  task,
  onTaskClick,
}: {
  task: TaskCardData;
  onTaskClick: (task: TaskCardData) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { status: task.status },
    });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-50 z-50")}
    >
      <TaskCard task={task} onClick={() => onTaskClick(task)} />
    </div>
  );
}

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: TaskCardData[];
  onTaskClick: (task: TaskCardData | null) => void;
}

export function KanbanColumn({
  status,
  label,
  color,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Header de colonne */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </h3>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Zone droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[120px] transition-colors duration-150",
          isOver
            ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
        )}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-gray-400 dark:text-gray-600">
            Déposez une tâche ici
          </div>
        )}
      </div>
    </div>
  );
}
