"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";

export interface Session {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface SessionContextValue {
  user: Session | null;
  login: (u: Session | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
}

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach((listener) => listener());
}

let cachedRaw: string | null = null;
let cachedUser: Session | null = null;

function readUserSnapshot(): Session | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(USER_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedUser = raw ? JSON.parse(raw) : null;
    } catch {
      cachedUser = null;
    }
  }
  return cachedUser;
}

function readUserServerSnapshot(): Session | null {
  return null;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUserSnapshot, readUserServerSnapshot);

  const login = useCallback((u: Session | null) => {
    try {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    } catch {}
    notify();
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
    notify();
  }, []);

  const saveScore = useCallback((entry: Omit<ScoreEntry, "at">) => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      const all: ScoreEntry[] = raw ? JSON.parse(raw) : [];
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch {}
  }, []);

  return (
    <SessionContext.Provider value={{ user, login, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
