"use server";

import { revalidatePath } from "next/cache";

import { GAMES } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export type SaveScoreResult = { ok: true } | { ok: false; error: string };

const SCORE_MAX = 99_999_999;

const MSG = {
  session: "Inicia sesión para guardar tu marca.",
  game: "Juego desconocido.",
  score: "Puntuación inválida.",
  generic: "No se pudo guardar. Intenta de nuevo.",
} as const;

/**
 * Guarda la puntuación del usuario con sesión (spec 05).
 * La entrada llega del cliente, así que se valida aunque esté tipada.
 * RLS (user_id = auth.uid()) es la garantía final.
 */
export async function saveScore(input: {
  gameId: string;
  score: number;
}): Promise<SaveScoreResult> {
  const gameId = input?.gameId;
  const score = input?.score;

  if (typeof gameId !== "string" || !GAMES.some((g) => g.id === gameId)) {
    return { ok: false, error: MSG.game };
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > SCORE_MAX) {
    return { ok: false, error: MSG.score };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MSG.session };

  const { error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, game_id: gameId, score });

  if (error) return { ok: false, error: MSG.generic };

  revalidatePath("/", "layout");
  return { ok: true };
}
