import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Lecturas de puntuaciones (spec 05). Solo servidor: usa el cliente de
 * Supabase con cookies, así que solo puede importarse desde Server Components
 * o Server Actions.
 */

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  score: number;
  date: string; // "dd/mm/aaaa", derivada de created_at
}

export interface GameStats {
  best: number;
  plays: number;
}

type LeaderboardViewRow = Database["public"]["Views"]["game_leaderboard"]["Row"];

const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** created_at (ISO) → "dd/mm/aaaa". */
function formatDate(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "";
}

function toLeaderboardRow(row: LeaderboardViewRow): LeaderboardRow {
  return {
    rank: row.rank ?? 0,
    userId: row.user_id ?? "",
    username: row.username ?? "",
    score: row.score ?? 0,
    date: formatDate(row.created_at),
  };
}

/** Top `limit` del juego: una fila por jugador con su mejor marca. */
export async function getLeaderboard(gameId: string, limit: number): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_leaderboard")
    .select("*")
    .eq("game_id", gameId)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`No se pudo leer el ranking de ${gameId}: ${error.message}`);
  return (data ?? []).map(toLeaderboardRow);
}

/** Mejor marca del usuario en el juego, con su rango real, o null si no tiene. */
export async function getUserBest(gameId: string, userId: string): Promise<LeaderboardRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_leaderboard")
    .select("*")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer tu marca en ${gameId}: ${error.message}`);
  return data ? toLeaderboardRow(data) : null;
}

/** Récord y número de puntuaciones guardadas, indexado por game_id. */
export async function getGameStats(): Promise<Record<string, GameStats>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("game_stats").select("*");

  if (error) throw new Error(`No se pudieron leer las estadísticas: ${error.message}`);

  const stats: Record<string, GameStats> = {};
  for (const row of data ?? []) {
    if (!row.game_id) continue;
    stats[row.game_id] = { best: row.best ?? 0, plays: row.plays ?? 0 };
  }
  return stats;
}
