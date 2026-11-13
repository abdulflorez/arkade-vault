"use client";

import { createContext, startTransition, useCallback, useContext, type ReactNode } from "react";

import { saveScore as saveScoreAction, type SaveScoreResult } from "@/app/games/actions";
import { signOut as signOutAction } from "@/app/login/actions";

export interface Session {
  name: string; // = profiles.username
}

export interface ScoreInput {
  game: string;
  score: number;
}

interface SessionContextValue {
  user: Session | null;
  signOut: () => void;
  saveScore: (entry: ScoreInput) => Promise<SaveScoreResult>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * El usuario llega ya resuelto desde el servidor (layout.tsx). Tras signIn,
 * signUp o signOut, las Server Actions revalidan el layout y llega el nuevo.
 */
export function SessionProvider({ children, user }: { children: ReactNode; user: Session | null }) {
  const signOut = useCallback(() => {
    startTransition(() => signOutAction());
  }, []);

  // Spec 05: las puntuaciones se guardan en Supabase vía Server Action.
  const saveScore = useCallback(async ({ game, score }: ScoreInput): Promise<SaveScoreResult> => {
    try {
      return await saveScoreAction({ gameId: game, score });
    } catch {
      // Error de red o de la acción: se trata igual que un fallo de guardado.
      return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
    }
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
