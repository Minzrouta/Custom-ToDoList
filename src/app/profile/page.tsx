// src/app/profile/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/ui/Header";
import { UserDiscordSettings } from "@/components/ui/UserDiscordSettings";
import { ProfileForm } from "@/components/ui/ProfileForm";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, discordId: true },
  });

  if (!user) redirect("/auth/signin");

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
          <span>Profil</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Mon profil
        </h1>

        <ProfileForm
          initialName={user.name ?? ""}
          initialImage={user.image}
          email={user.email ?? ""}
        />

        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Intégrations
          </h2>
          <UserDiscordSettings initialDiscordId={user.discordId} />
        </section>
      </main>
    </div>
  );
}
