"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  workspaceId: string;
  initialGuildId: string | null;
  initialChannelId: string | null;
}

export function WorkspaceDiscordSettings({
  workspaceId,
  initialGuildId,
  initialChannelId,
}: Props) {
  const [guildId, setGuildId] = useState(initialGuildId ?? "");
  const [channelId, setChannelId] = useState(initialChannelId ?? "");
  const [loading, setLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/discord`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordGuildId: guildId.trim() || null,
          discordChannelId: channelId.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement");
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

  async function handleUnlink() {
    if (!window.confirm("Délier ce serveur Discord du workspace ?")) return;
    setUnlinkLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/discord`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la suppression");
        return;
      }
      setGuildId("");
      setChannelId("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setUnlinkLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Intégration Discord
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Liez ce workspace à un serveur Discord pour utiliser les slash commands /task
        et recevoir les notifications de tâche dans un channel.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ID du serveur Discord (Guild ID)
          </label>
          <input
            type="text"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="ex: 1098765432109876543"
            pattern="\d{17,20}"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mode développeur Discord -&gt; clic droit sur le serveur -&gt; Copier l&apos;ID.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ID du channel de notifications
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="ex: 1098765432109876544"
            pattern="\d{17,20}"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Le channel où seront postées les notifications. Le bot doit y avoir accès.
          </p>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Configuration mise à jour.
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
          {(initialGuildId || initialChannelId) && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinkLoading}
              className="px-4 py-2 text-sm rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 transition-colors"
            >
              {unlinkLoading ? "Suppression..." : "Délier"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
