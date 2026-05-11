// src/app/search/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Récupérer les workspaceIds dont l'user est membre (NFR-02 isolation)
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });
  const workspaceIds = memberships.map((m) => m.workspaceId);

  const tasks =
    query.length === 0 || workspaceIds.length === 0
      ? []
      : await prisma.task.findMany({
          where: {
            workspaceId: { in: workspaceIds },
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          include: {
            workspace: { select: { id: true, name: true } },
            category: { select: { id: true, name: true, color: true } },
            assignee: { select: { id: true, name: true, image: true } },
          },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 50,
        });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={session.user} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link
            href="/dashboard"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Mes workspaces
          </Link>
          {" / "}
          <span>Recherche</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Résultats de recherche
        </h1>
        {query.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tape une requête dans la barre de recherche du header pour trouver des tâches.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {tasks.length} résultat{tasks.length > 1 ? "s" : ""} pour{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                &quot;{query}&quot;
              </strong>
            </p>
            {tasks.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p className="text-lg">Aucune tâche ne correspond à cette recherche.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/workspace/${task.workspaceId}/list`}
                      className="block p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {task.title}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {task.workspace.name}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {task.category && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: task.category.color }}
                          >
                            {task.category.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {task.status} · {task.priority}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
