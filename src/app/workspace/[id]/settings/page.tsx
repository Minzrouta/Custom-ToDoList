// src/app/workspace/[id]/settings/page.tsx
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { WorkspaceSettingsForm } from "@/components/ui/WorkspaceSettingsForm";
import Link from "next/link";

export default async function WorkspaceSettingsPage({
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
    include: { workspace: true },
  });

  if (!membership || membership.role !== "OWNER") notFound();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header user={session.user} />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link
            href="/dashboard"
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Mes workspaces
          </Link>
          {" / "}
          <Link
            href={`/workspace/${id}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            {membership.workspace.name}
          </Link>
          {" / "}
          <span>Paramètres</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Paramètres du workspace
        </h1>
        <WorkspaceSettingsForm
          workspaceId={id}
          currentName={membership.workspace.name}
        />
      </main>
    </div>
  );
}
