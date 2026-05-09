"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  workspaceId: string;
  initialProjectId: string | null;
  initialBaseUrl: string | null;
  initialWebhookSecret: string | null;
}

export function WorkspaceGitlabSettings({
  workspaceId,
  initialProjectId,
  initialBaseUrl,
  initialWebhookSecret,
}: Props) {
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl ?? "");
  const [secret, setSecret] = useState(initialWebhookSecret ?? "");
  const [loading, setLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [endpointUrl, setEndpointUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpointUrl(
        `${window.location.origin}/api/webhooks/gitlab/${workspaceId}`,
      );
    }
  }, [workspaceId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/gitlab`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitlabProjectId: projectId.trim() || null,
          gitlabBaseUrl: baseUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      if (data.data?.gitlabWebhookSecret) {
        setSecret(data.data.gitlabWebhookSecret);
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        "Régénérer le secret webhook ? L'ancien secret sera invalidé immédiatement.",
      )
    ) {
      return;
    }
    setRegenerateLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/gitlab`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitlabProjectId: projectId.trim() || null,
          gitlabBaseUrl: baseUrl.trim() || null,
          regenerateSecret: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la régénération");
        return;
      }
      if (data.data?.gitlabWebhookSecret) {
        setSecret(data.data.gitlabWebhookSecret);
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setRegenerateLoading(false);
    }
  }

  async function handleUnlink() {
    if (
      !window.confirm(
        "Délier le repo GitLab ? La configuration et le secret seront effacés.",
      )
    ) {
      return;
    }
    setUnlinkLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/gitlab`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la suppression");
        return;
      }
      setProjectId("");
      setBaseUrl("");
      setSecret("");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setUnlinkLoading(false);
    }
  }

  async function handleCopySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      setError("Impossible de copier dans le presse-papiers");
    }
  }

  async function handleCopyEndpoint() {
    if (!endpointUrl) return;
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 2000);
    } catch {
      setError("Impossible de copier dans le presse-papiers");
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const hasConfig =
    !!initialProjectId || !!initialBaseUrl || !!initialWebhookSecret;

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Intégration GitLab
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Liez ce workspace à un projet GitLab pour importer automatiquement les
        issues comme tâches.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Base URL GitLab
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://gitlab.com"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Laissez vide pour utiliser https://gitlab.com. Renseignez l&apos;URL
            de votre instance pour un GitLab self-hosted.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Project ID ou path
          </label>
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="mygroup/myrepo ou 12345"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ID numérique du projet ou path complet (group/repo) — utilisé pour
            identifier les webhooks entrants.
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL du webhook à coller dans GitLab
          </label>
          <div className="flex gap-2 items-stretch">
            <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 break-all border border-gray-200 dark:border-gray-700">
              {endpointUrl || "(chargement…)"}
            </code>
            <button
              type="button"
              onClick={handleCopyEndpoint}
              disabled={!endpointUrl}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {copiedEndpoint ? "Copié !" : "Copier"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Secret webhook
          </label>
          <div className="flex gap-2 items-stretch">
            <code className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200 break-all border border-gray-200 dark:border-gray-700">
              {secret || "(non généré — sauvegardez d'abord)"}
            </code>
            <button
              type="button"
              onClick={handleCopySecret}
              disabled={!secret}
              className="px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {copiedSecret ? "Copié !" : "Copier"}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerateLoading}
              className="px-3 py-2 text-xs rounded-lg border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {regenerateLoading ? "Régénération…" : "Régénérer"}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            À coller dans GitLab comme &laquo; Secret token &raquo;. Régénérer
            invalide immédiatement l&apos;ancien secret — pensez à le mettre à
            jour côté GitLab.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
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
          {hasConfig && (
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

      <div className="mt-5 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
        <p className="font-medium">Configuration côté GitLab :</p>
        <ol className="list-decimal pl-5 space-y-0.5">
          <li>
            Aller dans <code>Settings → Webhooks</code> de votre projet.
          </li>
          <li>Coller l&apos;URL ci-dessus dans le champ &laquo; URL &raquo;.</li>
          <li>
            Coller le secret ci-dessus dans &laquo; Secret token &raquo;.
          </li>
          <li>
            Cocher uniquement <code>Issues events</code>.
          </li>
          <li>
            Sauvegarder. Le webhook utilisera le header{" "}
            <code>X-Gitlab-Token</code> pour valider chaque appel.
          </li>
        </ol>
      </div>
    </section>
  );
}
