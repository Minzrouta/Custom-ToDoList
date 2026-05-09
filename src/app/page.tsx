export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Gestionnaire de tâches</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Application de gestion de tâches — déploiement en cours
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Phase 1 — Infrastructure prête
        </div>
      </div>
    </main>
  );
}
