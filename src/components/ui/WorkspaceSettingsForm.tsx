// src/components/ui/WorkspaceSettingsForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  currentName: string;
}

export function WorkspaceSettingsForm({
  workspaceId,
  currentName,
}: WorkspaceSettingsFormProps) {
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur lors du renommage");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Supprimer le workspace "${currentName}" ? Cette action est irréversible.`
      )
    )
      return;

    setDeleteLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la suppression");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Section renommage */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Nom du workspace
        </h2>
        <form onSubmit={handleRename} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Nom mis à jour.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim() || name.trim() === currentName}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </section>

      {/* Section suppression */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
          Zone de danger
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          La suppression d'un workspace est irréversible. Toutes les tâches
          associées seront supprimées.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleteLoading}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {deleteLoading ? "Suppression..." : "Supprimer ce workspace"}
        </button>
      </section>
    </div>
  );
}
