// src/components/tasks/FilterBar.tsx
"use client";

import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

export interface TaskFilters {
  status: TaskStatus | "";
  priority: Priority | "";
  categoryId: string;
  tagId: string;
  assigneeId: string;
}

interface FilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  categories: { id: string; name: string; color: string }[];
  tags: { id: string; name: string }[];
  members: { id: string; name: string | null; image: string | null }[];
  onAddTask: () => void;
}

const SELECT_CLASS =
  "text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500";

export function FilterBar({ filters, onFilterChange, categories, tags, members, onAddTask }: FilterBarProps) {
  function set<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    onFilterChange({ ...filters, [key]: value });
  }

  const hasActiveFilters =
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.categoryId !== "" ||
    filters.tagId !== "" ||
    filters.assigneeId !== "";

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Statut */}
      <select
        value={filters.status}
        onChange={(e) => set("status", e.target.value as TaskStatus | "")}
        className={SELECT_CLASS}
        aria-label="Filtrer par statut"
      >
        <option value="">Tous les statuts</option>
        <option value="todo">À faire</option>
        <option value="in_progress">En cours</option>
        <option value="done">Terminé</option>
        <option value="cancelled">Annulé</option>
      </select>

      {/* Priorité */}
      <select
        value={filters.priority}
        onChange={(e) => set("priority", e.target.value as Priority | "")}
        className={SELECT_CLASS}
        aria-label="Filtrer par priorité"
      >
        <option value="">Toutes les priorités</option>
        <option value="urgent">Urgente</option>
        <option value="high">Haute</option>
        <option value="medium">Normale</option>
        <option value="low">Faible</option>
      </select>

      {/* Catégorie */}
      {categories.length > 0 && (
        <select
          value={filters.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Tag */}
      {tags.length > 0 && (
        <select
          value={filters.tagId}
          onChange={(e) => set("tagId", e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrer par tag"
        >
          <option value="">Tous les tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </select>
      )}

      {/* Assignee */}
      {members.length > 1 && (
        <select
          value={filters.assigneeId}
          onChange={(e) => set("assigneeId", e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrer par assigné"
        >
          <option value="">Tous les assignés</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.id}
            </option>
          ))}
        </select>
      )}

      {/* Réinitialiser */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onFilterChange({ status: "", priority: "", categoryId: "", tagId: "", assigneeId: "" })
          }
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline px-2 py-1.5"
        >
          Réinitialiser
        </button>
      )}

      {/* Spacer + bouton nouvelle tâche */}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onAddTask}
        className={cn(
          "px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700",
          "text-white font-medium transition-colors"
        )}
      >
        + Nouvelle tâche
      </button>
    </div>
  );
}
