# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Implemented
> **Depends on:** ninguna (primera spec del proyecto)
> **Date:** 2026-08-12
> **Objective:** Construir un Arkanoid jugable de principio a fin (paleta, bola, bloques, vidas, puntuación y victoria/derrota) abriendo un único HTML en el navegador, sin dependencias externas.

## Scope

**In:**

- Un único nivel fijo de bloques (grid de 6 filas x 13 columnas, colores variados).
- Movimiento de la paleta por teclado (flechas izquierda/derecha y A/D) y por mouse (seguir el cursor).
- Física de la bola: lanzamiento desde la paleta, rebote en paredes y techo, rebote en la paleta con ángulo variable según el punto de impacto.
- Rotura de bloques: animación de explosión (`EXPLOSION_FRAMES`), suma de puntos fijos por bloque, sonido `break-sound.mp3`.
- Sonido `ball-bounce.mp3` en cada rebote contra paleta/paredes/techo.
- Sistema de vidas: 3 vidas, se pierde una al caer la bola por debajo de la paleta.
- Estados de juego: Start Screen, jugando, Pausa (tecla Esc), Game Over (0 vidas) y Victoria (todos los bloques rotos).
- Puntuación en pantalla durante la partida.
- High score persistido en `localStorage`, mostrado en Start Screen, Game Over y Victoria.
- Reinicio desde Game Over/Victoria de vuelta al Start Screen (tecla Enter o click), preservando el high score.
- Punto de entrada `assets/index.html`, reutilizando `assets/assets/spritesheet.js` y los sonidos existentes sin modificarlos.

**Out of scope (for future specs):**

- Múltiples niveles o progresión entre niveles.
- Power-ups (bola múltiple, paleta grande/chica, etc.).
- Puntuación variable según color de bloque.
- Tabla de high scores con múltiples entradas (solo se guarda el mejor puntaje, no un historial).
- Versión móvil / controles táctiles.
- Menú de opciones (volumen, dificultad, etc.).

## Data model

```js
// assets/game.js — estado central del juego
const state = {
  screen: 'start', // 'start' | 'playing' | 'paused' | 'gameover' | 'victory'
  score: 0,
  highScore: 0, // cargado desde localStorage al iniciar
  lives: 3,
  paddle: { x: 0, y: 0, w: 162, h: 14, speed: 8 },
  ball: {
    x: 0, y: 0, radius: 8, dx: 0, dy: 0, speed: 5,
    attachedToPaddle: true, // true hasta que se lanza con Space/click
  },
  bricks: [
    // { x, y, w: 32, h: 16, color: 'red', alive: true, exploding: false, explosionFrame: 0, explosionStartedAt: 0 }
  ],
};
```

Convenciones:

- Canvas: 480x640 px, origen (0,0) en la esquina superior izquierda.
- Grid de bloques: 6 filas x 13 columnas, bloques de 32x16 px, sin espacio entre ellos, margen de 32 px a cada lado. Colores por fila (de arriba hacia abajo): `red`, `yellow`, `green`, `cyan`, `magenta`, `hotpink` (los 6 colores de `SPRITES.blocks` excluyendo `gray`, que se reserva para posibles power-ups en specs futuras).
- Puntos por bloque: 10 puntos fijos, sin importar el color.
- Clave de `localStorage`: `arkanoid:highScore:v1` (string numérico). Versión `v1` en la clave por si el formato cambia a futuro.
- Velocidades en píxeles/frame, actualizadas vía `requestAnimationFrame`.

## Implementation plan

1. Crear `assets/index.html` con un `<canvas id="game" width="480" height="640">`, enlace a `assets/style.css`, y `<script>` tags cargando `assets/spritesheet.js` (ruta relativa que resuelve a `assets/assets/spritesheet.js`) y `assets/game.js`. Prueba manual: abrir el archivo en el navegador, se ve un canvas vacío sin errores en consola.
2. En `assets/game.js`, implementar el loop principal (`requestAnimationFrame`) que llama `loadSpritesheet()` y, una vez cargado, dibuja la paleta y la bola en sus posiciones iniciales estáticas. Prueba manual: recargar y ver la paleta y la bola dibujadas con los sprites correctos.
3. Implementar movimiento de la paleta: `keydown`/`keyup` para flechas y A/D, y `mousemove` para seguir el cursor en X. Clampear la posición dentro del canvas. Prueba manual: mover la paleta con teclado y con el mouse, sin salirse del canvas.
4. Implementar el lanzamiento y movimiento de la bola: arranca pegada al centro de la paleta, se lanza hacia arriba con Space o click, rebota contra paredes izquierda/derecha/techo, y reproduce `assets/sounds/ball-bounce.mp3` en cada rebote. Prueba manual: lanzar la bola, verla rebotar en paredes y techo con sonido, y caer por el fondo (sin lógica de vidas aún).
5. Implementar el rebote en la paleta con ángulo variable según el punto de impacto (centro = recto, bordes = más angulado), reproduciendo también `ball-bounce.mp3`. Prueba manual: golpear la bola en distintos puntos de la paleta y observar cambios de ángulo.
6. Renderizar el grid de bloques (6x13, colores por fila) usando `drawSprite(ctx, 'block_' + color, ...)`. Prueba manual: recargar y ver el grid completo de bloques dibujado.
7. Implementar colisión bola-bloque: al impactar, el bloque entra en estado `exploding` reproduciendo `EXPLOSION_FRAMES` del color correspondiente durante `EXPLOSION_DURATION` (150ms) vía `drawFrame`, luego desaparece; se suman 10 puntos, se reproduce `assets/sounds/break-sound.mp3`, y la bola rebota. Prueba manual: romper bloques y ver la animación, el sonido y el puntaje incrementar en pantalla.
8. Implementar el sistema de vidas: si la bola cae por debajo de la paleta, se resta una vida y se reinicia la bola pegada a la paleta; al llegar a 0 vidas, `state.screen = 'gameover'`. Prueba manual: perder las 3 vidas y ver la transición a Game Over.
9. Implementar la pantalla de Victoria: cuando no quedan bloques vivos, `state.screen = 'victory'`. Prueba manual: romper todos los bloques y ver la transición a Victoria.
10. Implementar Start Screen y Pausa: el juego arranca en `state.screen = 'start'` (loop no mueve nada, muestra mensaje "Presiona Enter para jugar"); Enter/click pasa a `'playing'`; Esc alterna entre `'playing'` y `'paused'`, mostrando overlay y congelando el loop. Prueba manual: cargar la página (ve Start Screen), iniciar la partida, pausar y reanudar con Esc.
11. Implementar persistencia del high score: al cargar, leer `arkanoid:highScore:v1` de `localStorage` (0 si no existe); al terminar la partida (Game Over o Victoria), si `state.score > state.highScore`, actualizar `state.highScore` y guardarlo. Mostrar el high score en Start Screen, Game Over y Victoria. Prueba manual: superar el high score, recargar la página, y verificar que persiste.
12. Implementar el reinicio: desde Game Over o Victoria, Enter/click reinicia `score`, `lives`, `bricks` y posiciones de paleta/bola, y vuelve a `state.screen = 'start'`, preservando `highScore`. Prueba manual: jugar una partida completa, reiniciar, y jugar de nuevo sin recargar la página.

## Acceptance criteria

- [x] Abrir `index.html` directamente en el navegador carga el juego sin errores en consola.
- [x] La paleta se mueve con flechas izquierda/derecha, A/D, y siguiendo el mouse.
- [x] La bola se lanza con Space o click y rebota correctamente en paredes, techo y paleta.
- [x] El ángulo de rebote en la paleta varía según el punto de impacto.
- [x] Cada rebote en paleta/pared/techo reproduce `ball-bounce.mp3`.
- [x] Romper un bloque muestra la animación de explosión de su color, reproduce `break-sound.mp3`, y suma exactamente 10 puntos al score visible en pantalla.
- [x] Perder la bola resta una vida y la reinicia en la paleta; al llegar a 0 vidas se muestra la pantalla de Game Over.
- [x] Romper todos los bloques del nivel muestra la pantalla de Victoria.
- [x] Presionar Esc durante la partida pausa el juego y lo muestra visualmente; presionarlo de nuevo lo reanuda.
- [x] Al cargar la página se muestra la Start Screen antes de jugar.
- [x] El high score se guarda en `localStorage` bajo la clave `arkanoid:highScore:v1` y se muestra en Start Screen, Game Over y Victoria.
- [x] Recargar la página después de superar el high score conserva el nuevo valor.
- [x] Desde Game Over o Victoria, Enter o click reinician la partida (score, vidas, bloques) sin recargar la página, y sin perder el high score.

## Decisions

- **Sí:** `assets/index.html` como punto de entrada (junto a `game.js` y `style.css`), reutilizando `assets/assets/spritesheet.js` sin modificarlo. Es la opción que menos toca el código de assets ya existente, tal como sugiere CLAUDE.md.
- **No:** mover `index.html` a la raíz del repo. Hubiera requerido editar la ruta hardcodeada en `spritesheet.js`.
  - **Revisado post-implementación:** una vez jugable el MVP, se reorganizó el proyecto para que `assets/` contenga solo assets estáticos. `index.html`, `game.js` y `style.css` ahora viven en la raíz del repo; `assets/spritesheet.js`, `assets/spritesheet-breakout.png` y `assets/sounds/` quedaron un nivel más planos (`assets/spritesheet.js` en vez de `assets/assets/spritesheet.js`). Las rutas relativas ya usaban un solo nivel `assets/`, así que no hizo falta tocar código, solo mover archivos. Ver CLAUDE.md para el layout vigente.
- **Sí:** un solo nivel fijo para el MVP. Minimiza superficie de implementación y es suficiente para validar el loop completo del juego.
- **No:** niveles múltiples o generación aleatoria de bloques. Se deja para una spec futura de progresión.
- **Sí:** puntos fijos (10) por bloque, sin variar por color. Simplifica el modelo de datos y la validación.
- **No:** puntuación variable por color. Puede añadirse después sin romper el modelo actual (el campo `color` ya existe en cada bloque).
- **Sí:** rebote de paleta con ángulo variable según punto de impacto. Es el comportamiento clásico de Arkanoid y mejora la jugabilidad sin gran costo de implementación.
- **No:** reflexión simple (espejo). Se sentiría menos fiel al género.
- **Sí:** high score único vía `localStorage` con clave versionada (`:v1`). Cabe holgadamente en `localStorage` y la versión permite migrar el formato si cambia a futuro.
- **No:** historial de múltiples puntajes o backend remoto. Fuera de alcance para un MVP sin servidor.
- **Sí:** grid de 6 colores (excluyendo `gray`) en 6 filas x 13 columnas. Usa la mayoría de sprites disponibles sin reservar tiempo de diseño; `gray` queda disponible para un posible bloque "irrompible" o de power-up en specs futuras.
- **Sí:** animación de explosión (`EXPLOSION_FRAMES`) al romper bloques, ya que el asset ya existe y está listo para usarse (`drawFrame`, `EXPLOSION_DURATION`).
- **Sí:** controles duales (teclado + mouse) para la paleta, ya que ambos son estándar en clones de Arkanoid y el usuario los pidió explícitamente.

## What is **not** in this spec

- Múltiples niveles o progresión de niveles.
- Power-ups de cualquier tipo.
- Puntuación variable por color de bloque.
- Historial de high scores (solo se guarda el mejor puntaje).
- Controles táctiles / versión móvil.
- Menú de opciones (audio, dificultad, etc.).

Cada uno de estos, si se implementa, va en su propia spec.
