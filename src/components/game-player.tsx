"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/data";
import { useSession } from "@/lib/session-context";
import { GAME_REGISTRY, type GameHandle } from "@/games/registry";

const LIVES = 3;

export function GamePlayer({ game }: { game: Game }) {
  const { user, saveScore } = useSession();
  // Spec 06: si el juego está en el registro se monta el juego real; si no, el simulador.
  const RealGame = GAME_REGISTRY[game.id];
  const handleRef = useRef<GameHandle>(null);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [realLevel, setRealLevel] = useState(1);
  const [phase, setPhase] = useState("attract"); // solo juego real
  const [simPaused, setSimPaused] = useState(false); // solo simulador
  const [over, setOver] = useState(false);
  const name = user ? user.name : "INVITADO";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const paused = RealGame ? phase === "paused" : simPaused;
  const level = RealGame ? realLevel : Math.floor(score / 2500) + 1;

  const onSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveScore({ game: game.id, score });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      return;
    }
    setSaveError(result.error);
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  // Simulador: puntuación aleatoria (sin cambios para los juegos no registrados).
  useEffect(() => {
    if (RealGame || over || simPaused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [RealGame, over, simPaused]);

  const resetSaveState = () => {
    setSaved(false);
    setSaving(false);
    setSaveError(null);
  };

  const togglePause = () => {
    if (!RealGame) return setSimPaused((p) => !p);
    if (phase === "paused") handleRef.current?.resume();
    else handleRef.current?.pause();
  };

  const endGame = () => {
    if (!RealGame) return setOver(true);
    handleRef.current?.end(); // el motor responde con onGameOver
  };

  const restart = () => {
    resetSaveState();
    setOver(false);
    if (!RealGame) {
      setScore(0);
      setSimPaused(false);
      return;
    }
    handleRef.current?.start(); // partida nueva directa, sin modo demo
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            className="btn yellow"
            onClick={togglePause}
            disabled={!!RealGame && phase === "attract"}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {RealGame ? (
            <RealGame
              ref={handleRef}
              onStats={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setRealLevel(s.level);
              }}
              onPhaseChange={setPhase}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                resetSaveState();
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  {RealGame ? "PULSA P O REANUDAR PARA CONTINUAR" : "PULSA REANUDAR PARA CONTINUAR"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!user ? (
              <div className="input-row save-guest">
                <span className="save-label">INICIA SESIÓN PARA GUARDAR TU MARCA</span>
                <Link href="/login" className="btn yellow">
                  INICIAR SESIÓN
                </Link>
              </div>
            ) : saved ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : (
              <>
                <div className={"input-row" + (shake ? " shake" : "")}>
                  <span className="save-label">JUGADOR: {user.name}</span>
                  <button className="btn yellow" onClick={onSave} disabled={saving}>
                    {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && <div className="form-error">{saveError}</div>}
              </>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
