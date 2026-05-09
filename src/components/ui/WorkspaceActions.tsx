// src/components/ui/WorkspaceActions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { InviteModal } from "@/components/ui/InviteModal";

interface WorkspaceActionsProps {
  workspaceId: string;
  isOwner: boolean;
}

export function WorkspaceActions({
  workspaceId,
  isOwner,
}: WorkspaceActionsProps) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        {isOwner && (
          <button
            onClick={() => setShowInvite(true)}
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            + Inviter
          </button>
        )}
        {isOwner && (
          <Link
            href={`/workspace/${workspaceId}/settings`}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Paramètres
          </Link>
        )}
      </div>
      {showInvite && (
        <InviteModal
          workspaceId={workspaceId}
          onClose={() => setShowInvite(false)}
        />
      )}
    </>
  );
}
