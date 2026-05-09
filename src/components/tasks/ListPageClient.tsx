// src/components/tasks/ListPageClient.tsx
// Wrapper client pour la page liste — gère le state d'ouverture du TaskModal
"use client";

import { useState } from "react";
import { ListView } from "@/components/tasks/ListView";
import { TaskModal, TaskModalTask } from "@/components/tasks/TaskModal";
import { TaskCardData } from "@/components/tasks/TaskCard";

interface ListPageClientProps {
  tasks: TaskCardData[];
  categories: { id: string; name: string; color: string }[];
  tags: { id: string; name: string }[];
  members: { id: string; name: string | null; image: string | null }[];
  workspaceId: string;
}

export function ListPageClient({
  tasks,
  categories,
  tags,
  members,
  workspaceId,
}: ListPageClientProps) {
  // undefined = modal fermé, null = mode création, TaskModalTask = mode édition
  const [selectedTask, setSelectedTask] = useState<
    TaskModalTask | null | undefined
  >(undefined);

  async function openTask(task: TaskCardData | null) {
    if (task === null) {
      setSelectedTask(null);
      return;
    }
    // Charger les détails complets de la tâche pour récupérer description, sous-tâches, etc.
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}`
      );
      const data = await res.json();
      if (res.ok && data.data) {
        setSelectedTask(data.data as TaskModalTask);
        return;
      }
    } catch {
      // Fallback ci-dessous
    }
    // Fallback : utiliser les données partielles disponibles
    setSelectedTask({
      id: task.id,
      title: task.title,
      description: null,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      categoryId: task.category
        ? categories.find((c) => c.name === task.category?.name)?.id ?? null
        : null,
      assigneeId: task.assignee
        ? members.find((m) => m.name === task.assignee?.name)?.id ?? null
        : null,
      tags: task.tags,
      subtasks: [],
      _count: task._count,
    });
  }

  return (
    <>
      <ListView
        tasks={tasks}
        categories={categories}
        tags={tags}
        members={members}
        workspaceId={workspaceId}
        onOpenTask={openTask}
      />
      {selectedTask !== undefined && (
        <TaskModal
          workspaceId={workspaceId}
          task={selectedTask}
          categories={categories}
          tags={tags}
          members={members}
          onClose={() => setSelectedTask(undefined)}
        />
      )}
    </>
  );
}
