// src/components/ui/DashboardActions.tsx
"use client";

import { useState } from "react";
import { CreateWorkspaceModal } from "@/components/ui/CreateWorkspaceModal";

export function DashboardActions() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
      >
        + Nouveau workspace
      </button>
      {showModal && (
        <CreateWorkspaceModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
