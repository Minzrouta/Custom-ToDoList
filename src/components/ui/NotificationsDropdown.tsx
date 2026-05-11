// src/components/ui/NotificationsDropdown.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "task_assigned" | "task_due_soon" | "task_completed" | "task_mentioned";
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
  task: { id: string; title: string; workspaceId: string } | null;
  workspace: { id: string; name: string } | null;
}

const TYPE_ICONS: Record<NotificationItem["type"], string> = {
  task_assigned: "👤",
  task_due_soon: "⏰",
  task_completed: "✅",
  task_mentioned: "💬",
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationsDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data?.items ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  // Mount + revalidation onFocus + interval léger 60s
  useEffect(() => {
    fetchNotifs();
    const onFocus = () => fetchNotifs();
    const interval = setInterval(fetchNotifs, 60_000);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function handleClickNotif(notif: NotificationItem) {
    // Mark as read (optimistic)
    if (!notif.readAt) {
      setItems((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notif.id}`, { method: "PATCH" }).catch(() => {});
    }
    // Naviguer vers la tâche / workspace
    if (notif.task) {
      router.push(`/workspace/${notif.task.workspaceId}/list`);
    } else if (notif.workspace) {
      router.push(`/workspace/${notif.workspace.id}`);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    const previous = items;
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(previous);
      fetchNotifs();
    }
  }

  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Chargement…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Aucune notification
              </p>
            ) : (
              <ul>
                {items.map((notif) => (
                  <li key={notif.id}>
                    <button
                      type="button"
                      onClick={() => handleClickNotif(notif)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0",
                        !notif.readAt && "bg-blue-50/50 dark:bg-blue-900/10",
                      )}
                    >
                      <span aria-hidden="true" className="text-lg shrink-0">
                        {TYPE_ICONS[notif.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm text-gray-900 dark:text-gray-100 leading-snug",
                            !notif.readAt && "font-medium",
                          )}
                        >
                          {notif.title}
                        </p>
                        {notif.body && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                            {notif.body}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatRelative(notif.createdAt)}
                        </p>
                      </div>
                      {!notif.readAt && (
                        <span
                          className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
