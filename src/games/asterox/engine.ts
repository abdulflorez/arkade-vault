/**
 * ASTEROX — motor del juego (spec 06).
 *
 * Port a TypeScript de references/started_games/02-asteroids/game.js.
 * La jugabilidad (valores, física, power-ups) es idéntica a la referencia;
 * cambian la paleta (neón), el HUD (puntuación/vidas/nivel van a React) y el
 * flujo de inicio/fin (modo demo + callbacks en vez de overlay GAME OVER).
 *
 * Todo el estado vive en la instancia: no hay variables globales mutables.
 */

// ── Tipos públicos ────────────────────────────────────────────────────────────
export type AsteroxPhase = "attract" | "playing" | "dead" | "paused" | "gameover";

export interface AsteroxStats {
  score: number;
  lives: number; // 0..3
  level: number; // 1..n
}

export interface AsteroxCallbacks {
  onStats: (stats: AsteroxStats) => void; // solo cuando cambia algún valor
  onPhaseChange: (phase: AsteroxPhase) => void;
  onGameOver: (finalScore: number) => void;
}

// ── Constantes (idénticas a la referencia) ────────────────────────────────────
const W = 800;
const H = 600;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

type PowerUpType = "shield" | "triple" | "slow" | "hyper" | "laser" | "nova";

const POWERUP_TYPES: Record<PowerUpType, { letter: string; duration: number | null }> = {
  shield: { letter: "E", duration: null }, // Escudo Temporal (hasta un golpe o fin de nivel)
  triple: { letter: "T", duration: 10 }, // Disparo Triple
  slow: { letter: "R", duration: 6 }, // Ralentí (Slow Motion)
  hyper: { letter: "H", duration: 8 }, // Hiperpropulsión
  laser: { letter: "L", duration: 7 }, // Rayo Láser sostenido
  nova: { letter: "N", duration: null }, // Bomba Nova (inventario)
};
const POWERUP_KEYS = Object.keys(POWERUP_TYPES) as PowerUpType[];
const POWERUP_DROP_CHANCE = 0.15;
const NOVA_MAX = 2;
const LASER_RANGE = 550;
const NOSE = 21;

const START_LIVES = 3;
const START_ASTEROIDS = 4;
const ATTRACT_ASTEROIDS = 6;
const DEAD_TIME = 2;
const MAX_DT = 0.05;

// ── Paleta neón (tokens de la plataforma) ─────────────────────────────────────
const C = {
  bg: "#0a0a0f",
  cyan: "#00f5ff",
  magenta: "#ff006e",
  yellow: "#f5ff00",
  green: "#00ff88",
  ink: "#e6e9ff",
} as const;

/** "#rrggbb" + alpha → "rgba(r,g,b,a)". */
function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(2)})`;
}

// ── Utilidades puras ──────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

type Ctx = CanvasRenderingContext2D;
type Keys = Record<string, boolean>;

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(
    public x: number,
    public y: number,
    angle: number,
  ) {
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: Ctx) {
    ctx.save();
    ctx.fillStyle = C.yellow;
    ctx.shadowColor = C.yellow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(
    public x: number,
    public y: number,
    public size = 3,
  ) {
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: Ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = C.magenta;
    ctx.shadowColor = C.magenta;
    ctx.shadowBlur = 4; // glow leve: hay muchos asteroides en pantalla
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
// Figuras geométricas parpadeantes (wireframe) para mantener la estética retro.
function polygonPath(ctx: Ctx, sides: number, r: number, rotOffset = 0) {
  for (let i = 0; i < sides; i++) {
    const a = rotOffset + (i / sides) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function starPath(ctx: Ctx, points: number, rOuter: number, rInner: number) {
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
}

function boltPath(ctx: Ctx, r: number) {
  const pts: [number, number][] = [
    [0.2 * r, -1.0 * r],
    [-0.5 * r, 0.1 * r],
    [-0.05 * r, 0.1 * r],
    [-0.3 * r, 1.0 * r],
    [0.5 * r, -0.1 * r],
    [0.05 * r, -0.1 * r],
  ];
  pts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
}

function drawPowerupShape(ctx: Ctx, type: PowerUpType, r: number) {
  ctx.beginPath();
  switch (type) {
    case "shield":
      polygonPath(ctx, 6, r); // hexágono
      break;
    case "triple":
      polygonPath(ctx, 3, r, -Math.PI / 2); // triángulo
      break;
    case "slow":
      polygonPath(ctx, 4, r, Math.PI / 4); // rombo
      break;
    case "hyper":
      polygonPath(ctx, 5, r, -Math.PI / 2); // pentágono
      break;
    case "laser":
      boltPath(ctx, r); // rayo
      break;
    case "nova":
      starPath(ctx, 5, r, r * 0.45); // estrella
      break;
  }
  ctx.closePath();
  ctx.stroke();
}

class PowerUp {
  radius = 15;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  age = 0;
  ttl = 9; // desaparece si no se recoge a tiempo
  dead = false;

  constructor(
    public x: number,
    public y: number,
    public type: PowerUpType,
  ) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-0.8, 0.8);
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.age += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: Ctx, font: string) {
    // Parpadeo constante, y más rápido como advertencia antes de desaparecer
    const alpha =
      this.ttl < 2
        ? Math.floor(this.ttl * 10) % 2 === 0
          ? 1
          : 0.15
        : 0.4 + 0.6 * Math.abs(Math.sin(this.age * 4));

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = rgba(C.green, alpha);
    ctx.shadowColor = C.green;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    drawPowerupShape(ctx, this.type, this.radius);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = rgba(C.green, alpha);
    ctx.font = `bold 13px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POWERUP_TYPES[this.type].letter, this.x, this.y + 1);
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;

  // Power-ups activos
  hasShield = false; // dura hasta absorber un golpe o terminar el nivel
  shieldPulse = 0;
  tripleTime = 0;
  hyperTime = 0;
  laserTime = 0;
  firingLaser = false;

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
    this.hasShield = false;
    this.shieldPulse = 0;
    this.tripleTime = 0;
    this.hyperTime = 0;
    this.laserTime = 0;
    this.firingLaser = false;
  }

  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleTime > 0) this.tripleTime -= dt;
    if (this.hyperTime > 0) this.hyperTime -= dt;
    if (this.laserTime > 0) this.laserTime -= dt;
    if (this.hasShield) this.shieldPulse += dt;

    const hyper = this.hyperTime > 0;
    const ROT = hyper ? 4.6 : 3.5; // rad/s
    const THRUST = hyper ? 480 : 260; // px/s²
    const DRAG = hyper ? 0.993 : 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    if (this.tripleTime > 0) {
      const SPREAD = 0.22;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: Ctx) {
    if (this.dead) return;

    // Anillo del escudo temporal (no rota con la nave)
    if (this.hasShield) {
      const pulse = 0.5 + 0.5 * Math.sin(this.shieldPulse * 6);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = rgba(C.cyan, 0.35 + 0.35 * pulse);
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta: triángulo con muesca trasera
    ctx.strokeStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor (alterna amarillo / magenta)
    if (this.thrusting && Math.random() > 0.35) {
      const flame = Math.random() > 0.5 ? C.yellow : C.magenta;
      ctx.strokeStyle = rgba(flame, 0.9);
      ctx.shadowColor = flame;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.stroke();
    }

    // Rayo láser sostenido (dibujado en el eje local de la nave)
    if (this.firingLaser) {
      const flicker = 0.7 + Math.random() * 0.3;
      ctx.shadowColor = C.yellow;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = rgba(C.yellow, 0.18);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(NOSE, 0);
      ctx.lineTo(NOSE + LASER_RANGE, 0);
      ctx.stroke();

      ctx.strokeStyle = rgba(C.yellow, flicker);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(NOSE, 0);
      ctx.lineTo(NOSE + LASER_RANGE, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(
    public x: number,
    public y: number,
    public color: string,
  ) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: Ctx) {
    ctx.strokeStyle = rgba(this.color, this.ttl / this.life);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Motor ─────────────────────────────────────────────────────────────────────
const GAME_KEYS = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export class AsteroxEngine {
  private readonly ctx: Ctx;
  private readonly pixelFont: string;
  private readonly monoFont: string;

  // Entrada
  private keys: Keys = {};
  private justPressed: Keys = {};

  // Estado del juego
  private ship = new Ship();
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private score = 0;
  private lives = START_LIVES;
  private level = 1;
  private deadTimer = 0;
  private slowTime = 0; // tiempo restante de Ralentí (afecta a los asteroides)
  private novaCount = 0; // Bombas Nova guardadas en inventario
  private attractTime = 0; // reloj del parpadeo del modo demo

  private phase: AsteroxPhase = "attract";
  private pausedFrom: "playing" | "dead" = "playing";
  private lastStats = "";

  // Bucle
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: AsteroxCallbacks,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ASTEROX: el navegador no soporta canvas 2D");
    this.ctx = ctx;

    // Fuentes de la plataforma (next/font expone el nombre real en variables CSS).
    const css = getComputedStyle(canvas);
    this.pixelFont = css.getPropertyValue("--font-pixel").trim() || "monospace";
    this.monoFont = css.getPropertyValue("--font-jetbrains-mono").trim() || "monospace";

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    canvas.addEventListener("click", this.onCanvasClick);

    this.initAttract();
    this.setPhase("attract");
    this.startLoop();
  }

  // ── API pública ─────────────────────────────────────────────────────────────

  /** Partida nueva (desde el modo demo o tras gameover). */
  start() {
    if (this.destroyed) return;
    this.initGame();
    this.setPhase("playing");
    this.emitStats();
    this.startLoop();
  }

  /** Solo en playing/dead: congela el bucle. */
  pause() {
    if (this.phase !== "playing" && this.phase !== "dead") return;
    this.pausedFrom = this.phase;
    this.clearInput();
    this.stopLoop();
    this.setPhase("paused");
  }

  /** Solo en paused: vuelve a la fase previa sin salto de dt. */
  resume() {
    if (this.phase !== "paused") return;
    this.clearInput();
    this.setPhase(this.pausedFrom);
    this.startLoop();
  }

  /** Fuerza gameover con la puntuación actual. */
  end() {
    if (this.phase !== "playing" && this.phase !== "dead" && this.phase !== "paused") return;
    this.gameOver();
    this.startLoop(); // las partículas siguen animándose detrás del modal
  }

  /** Cancela el rAF y quita todos los listeners. */
  destroy() {
    this.destroyed = true;
    this.stopLoop();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("click", this.onCanvasClick);
  }

  // ── Entrada ─────────────────────────────────────────────────────────────────

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (this.phase === "gameover") return;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.phase === "paused") this.resume();
      else this.pause();
      return;
    }

    const isGameKey = GAME_KEYS.includes(e.code);
    if (
      isGameKey &&
      (this.phase === "playing" || this.phase === "dead" || this.phase === "attract")
    ) {
      e.preventDefault();
    }

    if (this.phase === "attract") {
      if (e.code === "Space" && !e.repeat) this.start();
      return;
    }
    if (this.phase === "paused") return;

    this.justPressed[e.code] = !this.keys[e.code];
    this.keys[e.code] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onBlur = () => this.pause();

  private onVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  private onCanvasClick = () => {
    if (this.phase === "attract") this.start();
  };

  private pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  private clearInput() {
    this.keys = {};
    this.justPressed = {};
  }

  // ── Bucle ───────────────────────────────────────────────────────────────────

  private startLoop() {
    if (this.rafId !== null || this.destroyed) return;
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.loop);
  }

  private stopLoop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private loop = (ts: number) => {
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, MAX_DT);
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    this.emitStats();
    this.rafId = this.destroyed ? null : requestAnimationFrame(this.loop);
  };

  // ── Estado ──────────────────────────────────────────────────────────────────

  private setPhase(phase: AsteroxPhase) {
    if (this.phase === phase && phase !== "attract") return;
    this.phase = phase;
    this.callbacks.onPhaseChange(phase);
  }

  private emitStats() {
    if (this.phase === "attract") return;
    const key = `${this.score}|${this.lives}|${this.level}`;
    if (key === this.lastStats) return;
    this.lastStats = key;
    this.callbacks.onStats({ score: this.score, lives: this.lives, level: this.level });
  }

  private initAttract() {
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.asteroids = [];
    for (let i = 0; i < ATTRACT_ASTEROIDS; i++) {
      this.asteroids.push(new Asteroid(rand(0, W), rand(0, H), randInt(1, 3)));
    }
  }

  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private initGame() {
    this.ship = new Ship();
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.slowTime = 0;
    this.novaCount = 0;
    this.lastStats = "";
    this.clearInput();
    this.spawnAsteroids(START_ASTEROIDS);
  }

  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.slowTime = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y, color));
  }

  private collectPowerUp(type: PowerUpType) {
    const ship = this.ship;
    switch (type) {
      case "shield":
        ship.hasShield = true;
        ship.shieldPulse = 0;
        break;
      case "triple":
        ship.tripleTime = POWERUP_TYPES.triple.duration!;
        break;
      case "slow":
        this.slowTime = POWERUP_TYPES.slow.duration!;
        break;
      case "hyper":
        ship.hyperTime = POWERUP_TYPES.hyper.duration!;
        break;
      case "laser":
        ship.laserTime = POWERUP_TYPES.laser.duration!;
        break;
      case "nova":
        if (this.novaCount < NOVA_MAX) this.novaCount++;
        break;
    }
  }

  private destroyAsteroid(a: Asteroid, newAsteroids: Asteroid[]) {
    a.dead = true;
    this.score += POINTS[a.size];
    this.explode(a.x, a.y, a.size * 5, C.magenta);
    newAsteroids.push(...a.split());
    if (Math.random() < POWERUP_DROP_CHANCE) {
      const type = POWERUP_KEYS[randInt(0, POWERUP_KEYS.length - 1)];
      this.powerUps.push(new PowerUp(a.x, a.y, type));
    }
  }

  private detonateNova() {
    if (this.novaCount <= 0 || this.asteroids.length === 0) return;
    this.novaCount--;
    for (const a of this.asteroids) {
      this.score += POINTS[a.size];
      this.explode(a.x, a.y, a.size * 6, C.magenta);
    }
    this.asteroids = [];
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14, C.cyan);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.setPhase("dead");
      this.deadTimer = DEAD_TIME;
    }
  }

  private gameOver() {
    this.ship.firingLaser = false;
    this.clearInput();
    this.emitStats();
    this.setPhase("gameover");
    this.callbacks.onGameOver(this.score);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  private update(dt: number) {
    if (this.phase === "attract") {
      this.attractTime += dt;
      this.asteroids.forEach((a) => a.update(dt));
      return;
    }

    this.powerUps.forEach((p) => p.update(dt));
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    if (this.phase === "gameover") {
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }

    if (this.phase === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt));
      if (this.deadTimer <= 0) {
        this.setPhase("playing");
        this.ship.reset();
      }
      return;
    }

    if (this.phase !== "playing") return;

    const ship = this.ship;
    if (this.slowTime > 0) this.slowTime -= dt;

    // Disparar (el rayo láser sostenido reemplaza el disparo normal mientras esté activo)
    if (ship.laserTime > 0) {
      ship.firingLaser = !!this.keys["Space"] && !ship.dead;
    } else {
      ship.firingLaser = false;
      if (this.pressed("Space")) this.bullets.push(...ship.tryShoot());
    }

    // Bomba Nova (inventario limitado)
    if (this.pressed("KeyB")) this.detonateNova();

    ship.update(dt, this.keys);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt * (this.slowTime > 0 ? 0.5 : 1)));
    this.particles.forEach((p) => p.update(dt));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);

    const newAsteroids: Asteroid[] = [];

    // Bala vs asteroide
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          this.destroyAsteroid(a, newAsteroids);
        }
      }
    }

    // Rayo láser vs asteroide (sostenido mientras se dispare)
    if (ship.firingLaser) {
      const ox = ship.x + Math.cos(ship.angle) * NOSE;
      const oy = ship.y + Math.sin(ship.angle) * NOSE;
      const ex = ox + Math.cos(ship.angle) * LASER_RANGE;
      const ey = oy + Math.sin(ship.angle) * LASER_RANGE;
      for (const a of this.asteroids) {
        if (!a.dead && distToSegment(a.x, a.y, ox, oy, ex, ey) < a.radius) {
          this.destroyAsteroid(a, newAsteroids);
        }
      }
    }

    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs power-up
    for (const p of this.powerUps) {
      if (p.dead) continue;
      if (p.type === "nova" && this.novaCount >= NOVA_MAX) continue; // inventario lleno
      if (dist(ship, p) < ship.radius + p.radius) {
        this.collectPowerUp(p.type);
        p.dead = true;
      }
    }
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          if (ship.hasShield) {
            ship.hasShield = false;
            ship.invincible = 0.6; // breve gracia tras absorber el impacto
            this.explode(ship.x, ship.y, 10, C.cyan);
          } else {
            this.killShip();
          }
          break;
        }
      }
    }

    // Nivel completado
    if (this.phase === "playing" && this.asteroids.length === 0) this.nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private draw() {
    const ctx = this.ctx;
    // Dibuja en coordenadas lógicas 800×600, sea cual sea la resolución real (DPR).
    const scale = this.canvas.width / W;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    if (this.phase === "attract") {
      this.asteroids.forEach((a) => a.draw(ctx));
      this.drawAttract();
      return;
    }

    this.particles.forEach((p) => p.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.powerUps.forEach((p) => p.draw(ctx, this.monoFont));
    this.bullets.forEach((b) => b.draw(ctx));
    this.ship.draw(ctx);

    this.drawHUD();
  }

  private drawAttract() {
    const ctx = this.ctx;
    const visible = Math.floor(this.attractTime * 2) % 2 === 0;
    if (!visible) return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `16px ${this.pixelFont}`;
    ctx.fillStyle = C.yellow;
    ctx.shadowColor = C.yellow;
    ctx.shadowBlur = 10;
    ctx.fillText("PULSA ESPACIO O HAZ CLIC PARA JUGAR", W / 2, H / 2);
    ctx.restore();
  }

  /** Solo lo propio del juego: power-ups activos e inventario de bombas. */
  private drawHUD() {
    const ctx = this.ctx;
    const ship = this.ship;
    ctx.save();
    ctx.font = `13px ${this.monoFont}`;
    ctx.textBaseline = "alphabetic";

    // Inventario de Bomba Nova
    ctx.textAlign = "right";
    ctx.fillStyle = this.novaCount > 0 ? C.green : rgba(C.ink, 0.35);
    ctx.fillText(`BOMBA [B] x${this.novaCount}`, W - 14, H - 14);

    // Power-ups activos en la nave / el juego
    const active: string[] = [];
    if (ship.hasShield) active.push("ESCUDO ACTIVO");
    if (ship.tripleTime > 0) active.push(`TRIPLE  ${ship.tripleTime.toFixed(1)}s`);
    if (ship.hyperTime > 0) active.push(`HIPER   ${ship.hyperTime.toFixed(1)}s`);
    if (ship.laserTime > 0) active.push(`LÁSER   ${ship.laserTime.toFixed(1)}s`);
    if (this.slowTime > 0) active.push(`RALENTÍ ${this.slowTime.toFixed(1)}s`);

    ctx.textAlign = "left";
    ctx.fillStyle = rgba(C.green, 0.85);
    active.forEach((t, i) => ctx.fillText(t, 14, H - 14 - i * 18));
    ctx.restore();
  }
}
