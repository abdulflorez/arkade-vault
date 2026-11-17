"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

import type { GameHandle } from "@/games/registry";
import { AsteroxEngine, type AsteroxPhase, type AsteroxStats } from "./engine";

const W = 800;
const H = 600;

export interface AsteroxGameProps {
  ref?: Ref<GameHandle>;
  onStats: (stats: AsteroxStats) => void;
  onPhaseChange: (phase: AsteroxPhase) => void;
  onGameOver: (finalScore: number) => void;
}

/**
 * Monta el canvas de ASTEROX y su motor (spec 06).
 * El motor se crea una vez por montaje y se destruye en la limpieza, así que
 * el doble montaje de Strict Mode no deja bucles ni listeners duplicados.
 */
export function AsteroxGame({ ref, onStats, onPhaseChange, onGameOver }: AsteroxGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroxEngine | null>(null);

  // Callbacks siempre actualizados sin recrear el motor.
  const callbacksRef = useRef({ onStats, onPhaseChange, onGameOver });
  useEffect(() => {
    callbacksRef.current = { onStats, onPhaseChange, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resolución real = lógica (800×600) × devicePixelRatio, para verse nítido.
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    const engine = new AsteroxEngine(canvas, {
      onStats: (s) => callbacksRef.current.onStats(s),
      onPhaseChange: (p) => callbacksRef.current.onPhaseChange(p),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      start: () => engineRef.current?.start(),
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      end: () => engineRef.current?.end(),
    }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      width={W}
      height={H}
      aria-label="ASTEROX: pulsa Espacio o haz clic para jugar"
    />
  );
}
