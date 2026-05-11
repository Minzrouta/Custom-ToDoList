// src/components/ui/Header.tsx
"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsDropdown } from "@/components/ui/NotificationsDropdown";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SearchInput } from "@/components/ui/SearchInput";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  className?: string;
}

export function Header({ user, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-4",
        "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800",
        className
      )}
    >
      <Link
        href="/dashboard"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0"
      >
        Gestionnaire de tâches
      </Link>

      <div className="flex-1 flex justify-center">
        <SearchInput />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationsDropdown />

        <Link
          href="/profile"
          aria-label="Mon profil"
          className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "Avatar"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300 hidden lg:inline">
            {user.name ?? user.email}
          </span>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="text-sm px-3 py-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </header>
  );
}
