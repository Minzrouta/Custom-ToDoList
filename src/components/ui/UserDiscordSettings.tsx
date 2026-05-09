"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialDiscordId: string | null;
}

export function UserDiscordSettings({ initialDiscordId }: Props) {
  const [discordId, setDiscordId] = useState(initialDiscordId ?? "");
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
      const res = await fetch("/api/users/me/discord", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: discordId.trim() }),
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
    if (!window.confirm("Supprimer la liaison Discord ?")) return;
    setUnlinkLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users/me/discord", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur");
        return;
      }
      setDiscordId("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setUnlinkLoading(false);
    }
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Compte Discord
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Renseignez votre Discord ID pour pouvoir utiliser les slash commands /task
        depuis Discord.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          type="text"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
          placeholder="ex: 198765432101234567"
          pattern="\d{17,20}"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Mode développeur Discord -&gt; Paramètres -&gt; Avancé -&gt; Mode développeur,
          puis clic droit sur votre nom -&gt; Copier l&apos;ID.
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {success && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Discord ID enregistré.
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !discordId.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
          {initialDiscordId && (
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
