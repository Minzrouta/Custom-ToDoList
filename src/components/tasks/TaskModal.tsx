// src/components/tasks/TaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type Priority = "low" | "medium" | "high" | "urgent";

interface Category {
  id: string;
  name: string;
  color: string;
}
interface Tag {
  id: string;
  name: string;
}
interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author: { id: string; name: string | null; image: string | null };
}

export interface TaskModalTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | string | null;
  categoryId: string | null;
  assigneeId: string | null;
  tags: { tag: { id: string; name: string } }[];
  subtasks: SubTask[];
  _count: { comments: number };
}

interface TaskModalProps {
  workspaceId: string;
  task: TaskModalTask | null; // null = création
  categories: Category[];
  tags: Tag[];
  members: Member[];
  onClose: () => void;
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

const SELECT_CLASS =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

const LABEL_CLASS =
  "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";

export function TaskModal({
  workspaceId,
  task,
  categories,
  tags,
  members,
  onClose,
}: TaskModalProps) {
  const router = useRouter();
  const isEditing = !!task;

  // Form state
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "medium"
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  );
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    task?.tags.map(({ tag }) => tag.id) ?? []
  );

  // Sous-tâches
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks ?? []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Commentaires
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Local state pour catégories + tags (permet d'ajouter inline sans rechargement page)
  const [localCategories, setLocalCategories] =
    useState<Category[]>(categories);
  const [localTags, setLocalTags] = useState<Tag[]>(tags);

  // Création inline catégorie
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Création inline tag
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  // Submit / delete
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Charger les commentaires en mode édition
  useEffect(() => {
    if (!isEditing || !task) return;
    fetch(`/api/workspaces/${workspaceId}/tasks/${task.id}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) setComments(d.data as Comment[]);
      })
      .catch(() => {});
  }, [isEditing, task, workspaceId]);

  // Toggle tag
  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  // Soumettre le formulaire principal
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Le titre est requis");
      return;
    }
    setLoading(true);
    setError("");

    const body = {
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      dueDate: dueDate || null,
      categoryId: categoryId || null,
      assigneeId: assigneeId || null,
      tagIds: selectedTagIds,
    };

    try {
      const url = isEditing
        ? `/api/workspaces/${workspaceId}/tasks/${task!.id}`
        : `/api/workspaces/${workspaceId}/tasks`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // Supprimer la tâche
  async function handleDelete() {
    if (!task) return;
    if (!confirm("Supprimer cette tâche définitivement ?")) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      router.refresh();
      onClose();
    } catch {
      setError("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  // Ajouter une sous-tâche
  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;
    setSubtaskLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}/subtasks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newSubtaskTitle.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok && data.data) {
        setSubtasks((prev) => [...prev, data.data as SubTask]);
        setNewSubtaskTitle("");
      }
    } catch {
    } finally {
      setSubtaskLoading(false);
    }
  }

  // Toggle sous-tâche
  async function handleToggleSubtask(subId: string, completed: boolean) {
    if (!task) return;
    const res = await fetch(
      `/api/workspaces/${workspaceId}/tasks/${task.id}/subtasks/${subId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      }
    );
    if (res.ok) {
      setSubtasks((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, completed } : s))
      );
    }
  }

  // Supprimer une sous-tâche
  async function handleDeleteSubtask(subId: string) {
    if (!task) return;
    const res = await fetch(
      `/api/workspaces/${workspaceId}/tasks/${task.id}/subtasks/${subId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSubtasks((prev) => prev.filter((s) => s.id !== subId));
    }
  }

  // Ajouter un commentaire
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${task.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok && data.data) {
        setComments((prev) => [...prev, data.data as Comment]);
        setNewComment("");
      }
    } catch {
    } finally {
      setCommentLoading(false);
    }
  }

  // Créer une catégorie inline (SC4)
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          color: newCategoryColor,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setLocalCategories((prev) => [...prev, data.data as Category]);
        setCategoryId(data.data.id);
        setNewCategoryName("");
      }
    } catch {
    } finally {
      setCreatingCategory(false);
    }
  }

  // Créer un tag inline (SC5)
  async function handleCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setLocalTags((prev) => [...prev, data.data as Tag]);
        setSelectedTagIds((prev) => [...prev, data.data.id]);
        setNewTagName("");
      }
    } catch {
    } finally {
      setCreatingTag(false);
    }
  }

  const formatDate = (d: Date | string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(d));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? "Modifier la tâche" : "Nouvelle tâche"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Titre */}
          <div>
            <label className={LABEL_CLASS}>Titre *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
              className={INPUT_CLASS}
              required
              maxLength={255}
            />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL_CLASS}>Description (markdown)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la tâche..."
              rows={4}
              className={cn(INPUT_CLASS, "resize-y")}
            />
          </div>

          {/* Statut + Priorité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={SELECT_CLASS}
              >
                <option value="todo">À faire</option>
                <option value="in_progress">En cours</option>
                <option value="done">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Priorité</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={SELECT_CLASS}
              >
                <option value="urgent">Urgente</option>
                <option value="high">Haute</option>
                <option value="medium">Normale</option>
                <option value="low">Faible</option>
              </select>
            </div>
          </div>

          {/* Catégorie + Date d'échéance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Catégorie</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Aucune catégorie</option>
                {localCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {/* Création catégorie inline (SC4) */}
              <div className="flex gap-1 mt-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nouvelle catégorie…"
                  className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-8 h-7 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  title="Couleur"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={creatingCategory || !newCategoryName.trim()}
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Date d&apos;échéance</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Assignee */}
          {members.length > 0 && (
            <div>
              <label className={LABEL_CLASS}>Assigné à</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Non assigné</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags — multi-select via boutons toggle + création inline (SC5) */}
          <div>
            <label className={LABEL_CLASS}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {localTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors",
                    selectedTagIds.includes(tag.id)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400"
                  )}
                >
                  #{tag.name}
                </button>
              ))}
              {localTags.length === 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-600">
                  Aucun tag — créez-en un ci-dessous.
                </span>
              )}
            </div>
            {/* Création tag inline (SC5) */}
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nouveau tag…"
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                + Tag
              </button>
            </div>
          </div>

          {/* Erreur + boutons */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 justify-between pt-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? "Enregistrement..."
                  : isEditing
                  ? "Enregistrer"
                  : "Créer"}
              </button>
            </div>
          </div>
        </form>

        {/* Section Sous-tâches — mode édition seulement */}
        {isEditing && (
          <div className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Sous-tâches ({subtasks.filter((s) => s.completed).length}/
              {subtasks.length})
            </h3>
            <ul className="space-y-2 mb-3">
              {subtasks.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={(e) =>
                      handleToggleSubtask(sub.id, e.target.checked)
                    }
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={cn(
                      "text-sm flex-1 text-gray-800 dark:text-gray-200",
                      sub.completed &&
                        "line-through text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {sub.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                    aria-label="Supprimer cette sous-tâche"
                  >
                    ×
                  </button>
                </li>
              ))}
              {subtasks.length === 0 && (
                <li className="text-sm text-gray-400 dark:text-gray-600">
                  Aucune sous-tâche
                </li>
              )}
            </ul>
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Ajouter une sous-tâche..."
                className={cn(INPUT_CLASS, "flex-1")}
              />
              <button
                type="submit"
                disabled={subtaskLoading || !newSubtaskTitle.trim()}
                className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                Ajouter
              </button>
            </form>
          </div>
        )}

        {/* Section Commentaires — mode édition seulement */}
        {isEditing && (
          <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Commentaires ({comments.length})
            </h3>
            <ul className="space-y-3 mb-4">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  {c.author.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.author.image}
                      alt={c.author.name ?? "Auteur"}
                      className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                      {(c.author.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {c.author.name ?? "Utilisateur"}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-600">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-gray-400 dark:text-gray-600">
                  Aucun commentaire
                </li>
              )}
            </ul>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className={cn(INPUT_CLASS, "flex-1")}
              />
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim()}
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Envoyer
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
