'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Power-ups ─────────────────────────────────────────────────────────────────
// Figuras geométricas parpadeantes (wireframe) para mantener la estética retro.
const POWERUP_TYPES = {
  shield: { letter: 'E', duration: null }, // Escudo Temporal (dura hasta un golpe o fin de nivel)
  triple: { letter: 'T', duration: 10 },  // Disparo Triple
  slow:   { letter: 'R', duration: 6  },  // Ralentí (Slow Motion)
  hyper:  { letter: 'H', duration: 8  },  // Hiperpropulsión
  laser:  { letter: 'L', duration: 7  },  // Rayo Láser sostenido
  nova:   { letter: 'N', duration: null }, // Bomba Nova (se guarda en inventario)
};
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);
const POWERUP_DROP_CHANCE = 0.15;
const NOVA_MAX = 2;
const LASER_RANGE = 550;

function polygonPath(sides, r, rotOffset = 0) {
  for (let i = 0; i < sides; i++) {
    const a  = rotOffset + (i / sides) * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}

function starPath(points, rOuter, rInner) {
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}

function boltPath(r) {
  const pts = [
    [ 0.2 * r, -1.0 * r],
    [-0.5 * r,  0.1 * r],
    [-0.05 * r, 0.1 * r],
    [-0.3 * r,  1.0 * r],
    [ 0.5 * r, -0.1 * r],
    [ 0.05 * r, -0.1 * r],
  ];
  pts.forEach(([px, py], i) => { if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
}

function drawPowerupShape(type, r) {
  ctx.beginPath();
  switch (type) {
    case 'shield': polygonPath(6, r); break;                       // hexágono
    case 'triple': polygonPath(3, r, -Math.PI / 2); break;         // triángulo
    case 'slow':   polygonPath(4, r, Math.PI / 4); break;          // rombo
    case 'hyper':  polygonPath(5, r, -Math.PI / 2); break;         // pentágono
    case 'laser':  boltPath(r); break;                             // rayo
    case 'nova':   starPath(5, r, r * 0.45); break;                // estrella
  }
  ctx.closePath();
  ctx.stroke();
}

class PowerUp {
  constructor(x, y, type) {
    this.x    = x;
    this.y    = y;
    this.type = type;
    this.radius = 15;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot      = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-0.8, 0.8);

    this.age  = 0;
    this.ttl  = 9; // desaparece si no se recoge a tiempo
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.age += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo constante, y más rápido como advertencia antes de desaparecer
    const alpha = this.ttl < 2
      ? (Math.floor(this.ttl * 10) % 2 === 0 ? 1 : 0.15)
      : 0.4 + 0.6 * Math.abs(Math.sin(this.age * 4));

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    drawPowerupShape(this.type, this.radius);
    ctx.restore();

    ctx.save();
    ctx.fillStyle    = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.font         = 'bold 13px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(POWERUP_TYPES[this.type].letter, this.x, this.y + 1);
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;

    // Power-ups activos
    this.hasShield  = false; // dura hasta absorber un golpe o terminar el nivel
    this.shieldPulse = 0;
    this.tripleTime = 0;
    this.hyperTime  = 0;
    this.laserTime  = 0;
    this.firingLaser = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleTime    > 0) this.tripleTime    -= dt;
    if (this.hyperTime     > 0) this.hyperTime     -= dt;
    if (this.laserTime     > 0) this.laserTime     -= dt;
    if (this.hasShield) this.shieldPulse += dt;

    const hyper  = this.hyperTime > 0;
    const ROT    = hyper ? 4.6 : 3.5;   // rad/s
    const THRUST = hyper ? 480 : 260;   // px/s²
    const DRAG   = hyper ? 0.993 : 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
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

  draw() {
    if (this.dead) return;

    // Anillo del escudo temporal (no rota con la nave)
    if (this.hasShield) {
      const pulse = 0.5 + 0.5 * Math.sin(this.shieldPulse * 6);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(255,255,255,${(0.35 + 0.35 * pulse).toFixed(2)})`;
      ctx.lineWidth   = 1.5;
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
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    // Rayo láser sostenido (dibujado en el eje local de la nave)
    if (this.firingLaser) {
      const NOSE = 21;
      const flicker = 0.7 + Math.random() * 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth   = 6;
      ctx.beginPath();
      ctx.moveTo(NOSE, 0);
      ctx.lineTo(NOSE + LASER_RANGE, 0);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255,255,255,${flicker.toFixed(2)})`;
      ctx.lineWidth   = 2;
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
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let slowTime;   // tiempo restante de Ralentí (afecta a los asteroides)
let novaCount;  // Bombas Nova guardadas en inventario

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  slowTime  = 0;
  novaCount = 0;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  slowTime  = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function collectPowerUp(type) {
  switch (type) {
    case 'shield': ship.hasShield = true; ship.shieldPulse = 0; break;
    case 'triple': ship.tripleTime = POWERUP_TYPES.triple.duration; break;
    case 'slow':   slowTime        = POWERUP_TYPES.slow.duration;   break;
    case 'hyper':  ship.hyperTime  = POWERUP_TYPES.hyper.duration;  break;
    case 'laser':  ship.laserTime  = POWERUP_TYPES.laser.duration;  break;
    case 'nova':   if (novaCount < NOVA_MAX) novaCount++;           break;
  }
}

function destroyAsteroid(a, newAsteroids) {
  a.dead = true;
  score += POINTS[a.size];
  explode(a.x, a.y, a.size * 5);
  newAsteroids.push(...a.split());
  if (Math.random() < POWERUP_DROP_CHANCE) {
    const type = POWERUP_KEYS[randInt(0, POWERUP_KEYS.length - 1)];
    powerUps.push(new PowerUp(a.x, a.y, type));
  }
}

function detonateNova() {
  if (novaCount <= 0 || asteroids.length === 0) return;
  novaCount--;
  for (const a of asteroids) {
    score += POINTS[a.size];
    explode(a.x, a.y, a.size * 6);
  }
  asteroids = [];
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  powerUps.forEach(p => p.update(dt));
  powerUps = powerUps.filter(p => !p.dead);

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  if (slowTime > 0) slowTime -= dt;

  // Disparar (el rayo láser sostenido reemplaza el disparo normal mientras esté activo)
  if (ship.laserTime > 0) {
    ship.firingLaser = !!keys['Space'] && !ship.dead;
  } else {
    ship.firingLaser = false;
    if (pressed('Space')) {
      bullets.push(...ship.tryShoot());
    }
  }

  // Bomba Nova (inventario limitado)
  if (pressed('KeyB')) detonateNova();

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt * (slowTime > 0 ? 0.5 : 1)));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  const newAsteroids = [];

  // Bala vs asteroide
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        destroyAsteroid(a, newAsteroids);
      }
    }
  }

  // Rayo láser vs asteroide (sostenido mientras se dispare)
  if (ship.firingLaser) {
    const NOSE = 21;
    const ox = ship.x + Math.cos(ship.angle) * NOSE;
    const oy = ship.y + Math.sin(ship.angle) * NOSE;
    const ex = ox + Math.cos(ship.angle) * LASER_RANGE;
    const ey = oy + Math.sin(ship.angle) * LASER_RANGE;
    for (const a of asteroids) {
      if (!a.dead && distToSegment(a.x, a.y, ox, oy, ex, ey) < a.radius) {
        destroyAsteroid(a, newAsteroids);
      }
    }
  }

  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (p.dead) continue;
    if (p.type === 'nova' && novaCount >= NOVA_MAX) continue; // inventario lleno, se deja flotando
    if (dist(ship, p) < ship.radius + p.radius) {
      collectPowerUp(p.type);
      p.dead = true;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.hasShield) {
          ship.hasShield   = false;
          ship.invincible  = 0.6; // breve gracia tras absorber el impacto
          explode(ship.x, ship.y, 10);
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Inventario de Bomba Nova
  ctx.textAlign = 'right';
  ctx.font      = '13px monospace';
  ctx.fillStyle = novaCount > 0 ? '#fff' : 'rgba(255,255,255,0.35)';
  ctx.fillText(`BOMBA [B] x${novaCount}`, W - 14, H - 14);

  // Power-ups activos en la nave / el juego
  const active = [];
  if (ship.hasShield) active.push('ESCUDO ACTIVO');
  if (ship.tripleTime > 0) active.push(`TRIPLE  ${ship.tripleTime.toFixed(1)}s`);
  if (ship.hyperTime  > 0) active.push(`HIPER   ${ship.hyperTime.toFixed(1)}s`);
  if (ship.laserTime  > 0) active.push(`LÁSER   ${ship.laserTime.toFixed(1)}s`);
  if (slowTime        > 0) active.push(`RALENTÍ ${slowTime.toFixed(1)}s`);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  active.forEach((t, i) => ctx.fillText(t, 14, H - 14 - i * 18));
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
