// src/components/ui/WorkspaceCard.tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    description?: string | null;
  };
  role: "OWNER" | "MEMBER";
}

export function WorkspaceCard({ workspace, role }: WorkspaceCardProps) {
  return (
    <Link
      href={`/workspace/${workspace.id}`}
      className={cn(
        "block p-6 rounded-xl border transition-all duration-200",
        "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700",
        "hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600",
        "hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
          {workspace.name}
        </h3>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            role === "OWNER"
              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          )}
        >
          {role === "OWNER" ? "Propriétaire" : "Membre"}
        </span>
      </div>
      {workspace.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {workspace.description}
        </p>
      )}
    </Link>
  );
}
