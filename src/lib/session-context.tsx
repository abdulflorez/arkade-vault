"use client";

import { createContext, startTransition, useCallback, useContext, type ReactNode } from "react";

import { signOut as signOutAction } from "@/app/login/actions";

export interface Session {
  name: string; // = profiles.username
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface SessionContextValue {
  user: Session | null;
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

const SCORES_KEY = "av_scores";

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * El usuario llega ya resuelto desde el servidor (layout.tsx). Tras signIn,
 * signUp o signOut, las Server Actions revalidan el layout y llega el nuevo.
 */
export function SessionProvider({ children, user }: { children: ReactNode; user: Session | null }) {
  const signOut = useCallback(() => {
    startTransition(() => signOutAction());
  }, []);

  // Sin cambios hasta el spec 05: las puntuaciones siguen en localStorage.
  const saveScore = useCallback((entry: Omit<ScoreEntry, "at">) => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      const all: ScoreEntry[] = raw ? JSON.parse(raw) : [];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  return (
    <SessionContext.Provider value={{ user, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
