// src/app/workspace/[id]/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { WorkspaceActions } from "@/components/ui/WorkspaceActions";
import Image from "next/image";
import Link from "next/link";

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

        {/* Placeholder tâches (Phase 3) */}
        <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center">
            Les tâches seront disponibles en Phase 3.
          </p>
        </div>
      </main>
    </div>
  );
}
