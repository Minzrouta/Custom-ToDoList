// src/components/tasks/ListView.tsx
"use client";

import { useState } from "react";
import { TaskCard, TaskCardData } from "@/components/tasks/TaskCard";
import { FilterBar, TaskFilters } from "@/components/tasks/FilterBar";

interface ListViewProps {
  tasks: TaskCardData[];
  categories: { id: string; name: string; color: string }[];
  tags: { id: string; name: string }[];
  members: { id: string; name: string | null; image: string | null }[];
  workspaceId: string;
  onOpenTask: (task: TaskCardData | null) => void;
}

const INITIAL_FILTERS: TaskFilters = {
  status: "",
  priority: "",
  categoryId: "",
  tagId: "",
  assigneeId: "",
};

function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.categoryId !== "" ||
    filters.tagId !== "" ||
    filters.assigneeId !== ""
  );
}

export function ListView({ tasks, categories, tags, members, onOpenTask }: ListViewProps) {
  const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS);

  const filtered = tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.categoryId && task.category?.id !== filters.categoryId) return false;
    if (filters.tagId && !task.tags.some(({ tag }) => tag.id === filters.tagId)) return false;
    if (filters.assigneeId && task.assignee?.id !== filters.assigneeId) return false;
    return true;
  });

  return (
    <div>
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        categories={categories}
        tags={tags}
        members={members}
        onAddTask={() => onOpenTask(null)}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-2">Aucune tâche.</p>
          {tasks.length > 0 && hasActiveFilters(filters) && (
            <p className="text-sm">Essayez de modifier vos filtres.</p>
          )}
          {tasks.length === 0 && (
            <p className="text-sm">Créez votre première tâche avec le bouton ci-dessus.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onOpenTask(task)} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-600 mt-4 text-right">
        {filtered.length} tâche{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== tasks.length && ` sur ${tasks.length}`}
      </p>
    </div>
  );
}
