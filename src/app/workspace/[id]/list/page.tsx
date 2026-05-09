// src/app/workspace/[id]/list/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { ListPageClient } from "@/components/tasks/ListPageClient";
import Link from "next/link";

export default async function WorkspaceListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: id } },
    include: { workspace: true },
  });

  if (!membership) notFound();

  // Charger tâches, catégories, tags, membres en parallèle
  // task.gitlabIssueIid + task.gitlabIssueUrl ramenés via include (scalaires)
  const [tasks, categories, tags, members] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: id },
      include: {
        category: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, image: true } },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        subtasks: { select: { completed: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.category.findMany({
      where: { workspaceId: id },
      orderBy: { name: "asc" },
    }),
    prisma.tag.findMany({
      where: { workspaceId: id },
      orderBy: { name: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  const memberUsers = members.map((m) => m.user);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={session.user} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">
            Mes workspaces
          </Link>
          {" / "}
          <Link href={`/workspace/${id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {membership.workspace.name}
          </Link>
          {" / "}
          <span>Liste</span>
        </nav>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {membership.workspace.name} — Vue liste
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/workspace/${id}/kanban`}
              className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Vue Kanban
            </Link>
          </div>
        </div>

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <ListPageClient
            tasks={tasks}
            categories={categories}
            tags={tags}
            members={memberUsers}
            workspaceId={id}
          />
        </section>
      </main>
    </div>
  );
}
