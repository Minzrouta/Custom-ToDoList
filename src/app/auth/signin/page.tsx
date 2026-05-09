// src/app/auth/signin/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInButtons } from "@/components/ui/SignInButtons";

export const metadata = {
  title: "Connexion — Gestionnaire de tâches",
};

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Gestionnaire de tâches
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Connectez-vous pour accéder à vos workspaces
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
            Connexion
          </h2>
          <SignInButtons />
        </div>
      </div>
    </main>
  );
}
