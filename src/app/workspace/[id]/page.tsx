// src/app/workspace/[id]/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { WorkspaceActions } from "@/components/ui/WorkspaceActions";
import Image from "next/image";
import Link from "next/link";

const DEFAULT_CATEGORIES = [
  { name: "Boulot", color: "#3b82f6" },
  { name: "Ecole", color: "#22c55e" },
  { name: "Perso", color: "#a855f7" },
];

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId: session.user.id, workspaceId: id },
    },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  // Seed catégories par défaut si absentes (FR-03)
  await Promise.all(
    DEFAULT_CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where: { name_workspaceId: { name: cat.name, workspaceId: id } },
        update: {},
        create: { name: cat.name, color: cat.color, workspaceId: id },
      })
    )
  );

  // Compter les tâches par statut
  const taskCounts = await prisma.task.groupBy({
    by: ["status"],
    where: { workspaceId: id },
    _count: true,
  });

  const countByStatus = {
    todo: taskCounts.find((t) => t.status === "todo")?._count ?? 0,
    in_progress: taskCounts.find((t) => t.status === "in_progress")?._count ?? 0,
    done: taskCounts.find((t) => t.status === "done")?._count ?? 0,
    cancelled: taskCounts.find((t) => t.status === "cancelled")?._count ?? 0,
  };
  const total = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={session.user} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <nav className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Link
                href="/dashboard"
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Mes workspaces
              </Link>
              {" / "}
              <span>{workspace.name}</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {workspace.name}
            </h1>
          </div>
          <WorkspaceActions
            workspaceId={id}
            isOwner={membership.role === "OWNER"}
          />
        </div>

        {/* Section membres */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Membres ({workspace.members.length})
          </h2>
          <ul className="space-y-3">
            {workspace.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {m.user.image ? (
                  <Image
                    src={m.user.image}
                    alt={m.user.name ?? "Avatar"}
                    width={36}
                    height={36}
                    className="rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {(m.user.name ?? m.user.email ?? "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {m.user.name ?? m.user.email}
                  </p>
                  {m.user.name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {m.user.email}
                    </p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {m.role === "OWNER" ? "Propriétaire" : "Membre"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section tâches */}
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Tâches ({total})
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href={`/workspace/${id}/list`}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Vue liste
              </Link>
              <Link
                href={`/workspace/${id}/kanban`}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Kanban
              </Link>
            </div>
          </div>
          {total === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Aucune tâche. Créez-en une depuis la vue liste ou kanban.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "À faire",
                  count: countByStatus.todo,
                  color: "text-gray-600 dark:text-gray-400",
                },
                {
                  label: "En cours",
                  count: countByStatus.in_progress,
                  color: "text-yellow-600 dark:text-yellow-400",
                },
                {
                  label: "Terminé",
                  count: countByStatus.done,
                  color: "text-green-600 dark:text-green-400",
                },
                {
                  label: "Annulé",
                  count: countByStatus.cancelled,
                  color: "text-red-600 dark:text-red-400",
                },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <p className={`text-2xl font-bold ${color}`}>{count}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
