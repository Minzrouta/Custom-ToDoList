// src/app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { WorkspaceCard } from "@/components/ui/WorkspaceCard";
import { DashboardActions } from "@/components/ui/DashboardActions";

export const metadata = {
  title: "Mes workspaces — Gestionnaire de tâches",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={session.user} />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Mes workspaces
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {memberships.length} workspace
              {memberships.length !== 1 ? "s" : ""}
            </p>
          </div>
          <DashboardActions />
        </div>

        {memberships.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">Aucun workspace trouvé.</p>
            <p className="text-sm">
              Créez votre premier workspace pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map((m) => (
              <WorkspaceCard
                key={m.workspace.id}
                workspace={m.workspace}
                role={m.role}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
