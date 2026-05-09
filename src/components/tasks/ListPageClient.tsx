// src/components/tasks/ListPageClient.tsx
// Wrapper client pour la page liste — gère le state d'ouverture du TaskModal
// Le TaskModal complet sera injecté ici en plan 04
"use client";

import { useState } from "react";
import { ListView } from "@/components/tasks/ListView";
import { TaskCardData } from "@/components/tasks/TaskCard";

interface ListPageClientProps {
  tasks: TaskCardData[];
  categories: { id: string; name: string; color: string }[];
  tags: { id: string; name: string }[];
  members: { id: string; name: string | null; image: string | null }[];
  workspaceId: string;
}

export function ListPageClient({ tasks, categories, tags, members, workspaceId }: ListPageClientProps) {
  const [, setSelectedTask] = useState<TaskCardData | null | undefined>(undefined);

  return (
    <ListView
      tasks={tasks}
      categories={categories}
      tags={tags}
      members={members}
      workspaceId={workspaceId}
      onOpenTask={(task) => setSelectedTask(task ?? null)}
    />
    // TaskModal sera ajouté ici en plan 04
  );
}
