import type { ComponentType, Ref } from "react";

import { AsteroxGame } from "./asterox/asterox-game";

/**
 * Registro de juegos reales (spec 06): id del catálogo (src/lib/data.ts) →
 * componente del juego. Los juegos que no están aquí siguen con el simulador
 * de GamePlayer.
 */

/** Control imperativo que cada juego real expone a GamePlayer. */
export interface GameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  end(): void;
}

/** Contrato entre GamePlayer y cualquier juego real. */
export interface RealGameProps {
  ref?: Ref<GameHandle>;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onPhaseChange: (phase: string) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<string, ComponentType<RealGameProps>> = {
  asterox: AsteroxGame,
};
