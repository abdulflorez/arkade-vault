# SPEC 03 — Progresión de niveles

> **Status:** Implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-13
> **Objective:** Añadir 10 niveles con figuras de bloques distintas (incluyendo bloques titanio irrompibles que no cuentan para ganar), un efecto de escala más pequeña ("zoom-out") único a partir del nivel 6, un selector manual de nivel durante la pausa, y un puntaje de racha que se corta al saltar manualmente de nivel.

## Scope

**In:**

- 10 niveles fijos, diseñados a mano en un array `LEVELS`, cada uno con una figura distinta de bloques (rombo, X, escalera, etc.) usando los 6 colores de bloque existentes (`red`, `yellow`, `green`, `cyan`, `magenta`, `hotpink`).
- Bloques titanio (sprite `block_gray`, reservado para este propósito en las decisiones de SPEC 01): irrompibles, no reproducen animación de explosión ni `break-sound.mp3`, no suman puntos, y no cuentan para la condición de victoria del nivel. La bola rebota físicamente contra ellos.
- Cantidad de bloques titanio creciente con el nivel: ausentes o mínimos en los primeros niveles, hasta 3-4 en los últimos, colocados a mano en puntos estratégicos de cada figura.
- Sonido distinto al golpear un bloque titanio: se reutiliza `ball-bounce.mp3` reproducido con `playbackRate` más alto y volumen reducido (más "agudo y suave"), sin agregar archivos de audio nuevos.
- Vidas (3) acumuladas durante toda la partida de hasta 10 niveles: no se reinician al pasar de nivel, ni de forma natural ni por salto manual.
- Al completar un nivel (romper todos los bloques no-titanio) se muestra una pantalla intermedia "Nivel completado"; Enter/click avanza automáticamente al siguiente nivel preservando puntaje y vidas.
- Completar el nivel 10 muestra la pantalla de Victoria existente.
- Efecto de escala ("zoom-out") único: desde el nivel 6 hasta el 10, bloques, paleta y bola se dibujan y colisionan al 70% de su tamaño actual, permitiendo diseños de nivel con más bloques visibles en el mismo canvas de 480x640. El cambio de escala ocurre una sola vez al entrar al nivel 6 (no es una animación gradual) y se mantiene igual del nivel 6 al 10.
- Selector de nivel: `<select>` HTML nativo superpuesto al canvas, visible únicamente cuando `state.screen === 'paused'`, con los 10 niveles listados y disponibles para elegir libremente, sin restricciones de desbloqueo.
- Elegir en el selector un nivel distinto al actual carga ese nivel (bloques nuevos, bola reiniciada en la paleta) y resetea el puntaje acumulado de la racha actual a 0, empezando a acumular de nuevo desde ese nivel. Elegir el mismo nivel en el que ya se está no tiene ningún efecto.
- Puntaje de racha: se acumula de forma continua mientras el avance entre niveles sea natural (completar nivel → siguiente automático); se resetea a 0 únicamente al saltar manualmente de nivel vía el selector. El high score (`arkanoid:highScore:v1`) se sigue comparando y persistiendo contra el puntaje de la racha actual en Game Over/Victoria, igual que hoy.

**Out of scope (for future specs):**

- Persistencia entre sesiones del nivel alcanzado o de un sistema de desbloqueo progresivo (solo se mantiene el high score existente).
- Power-ups de cualquier tipo.
- Editor de niveles o generación procedural de niveles.
- Animación gradual de cámara para el efecto de zoom (se implementa como cambio de escala instantáneo, no una transición).
- Cambios de dificultad adicionales no descritos aquí (velocidad de bola, comportamiento de IA, etc.).
- Archivos de audio nuevos (el sonido de titanio reutiliza `ball-bounce.mp3` con `playbackRate` alterado).
- Contenido más allá del nivel 10 (New Game+, niveles infinitos, etc.).

## Data model

```js
// game.js
const TITANIUM_SPRITE = 'block_gray';
const ZOOM_START_LEVEL = 6; // desde este nivel (inclusive) se aplica la escala reducida
const ZOOM_SCALE = 0.7; // factor aplicado a bloques, paleta y bola desde ZOOM_START_LEVEL

const LEVELS = [
  // 10 entradas, una por nivel (índice 0 = nivel 1)
  {
    cols: 13, // columnas de la grilla lógica de este nivel
    rows: 6, // filas de la grilla lógica de este nivel
    cells: [
      // { col, row, type: 'red' | 'yellow' | 'green' | 'cyan' | 'magenta' | 'hotpink' | 'titanium' }
    ],
  },
  // ...niveles 2 a 10 (6-10 usan grillas más grandes, acordes a ZOOM_SCALE)
];

const state = {
  // ...campos existentes (highScore, lives, paddle, ball, bricks, particles)
  screen: 'start', // añade 'levelcomplete' a los valores existentes
  level: 1, // nivel actual, 1-10
  scale: 1, // 1 para niveles 1-5, ZOOM_SCALE para niveles 6-10 (derivado de `level`)
  score: 0, // puntaje de la racha actual (mismo campo existente; ver reglas de corte abajo)
  bricks: [
    // { x, y, w, h, color, breakable: true, alive: true, exploding: false, ... } (bloques normales)
    // { x, y, w, h, color: 'titanium', breakable: false, alive: true } (bloques titanio, alive siempre true)
  ],
};
```

Convenciones:

- `LEVELS[n].cells` define qué celdas de la grilla lógica tienen bloque y de qué tipo; `loadLevel(n)` traduce cada celda a un objeto de `state.bricks` con posición absoluta calculada desde `col`/`row`, el tamaño base de bloque (32x16) y `state.scale`.
- `type: 'titanium'` en una celda produce un bloque con `breakable: false`, dibujado con `drawSprite(ctx, TITANIUM_SPRITE, ...)`; nunca cambia `alive` a `false` ni entra en estado `exploding`.
- La condición de "nivel completado" es: todos los bloques con `breakable: true` tienen `alive: false` (los bloques titanio se ignoran en este chequeo).
- `state.scale` se deriva de `state.level`: `1` si `level < ZOOM_START_LEVEL`, `ZOOM_SCALE` si `level >= ZOOM_START_LEVEL`. Afecta el tamaño de dibujo y los cálculos de colisión de `paddle`, `ball` y `bricks`.
- El corte de puntaje (`state.score = 0`) ocurre solo dentro del manejador de selección manual del `<select>` de niveles, nunca en el flujo de "nivel completado → siguiente nivel".

## Implementation plan

1. Definir `TITANIUM_SPRITE`, `ZOOM_START_LEVEL`, `ZOOM_SCALE`, y la estructura `LEVELS` con las 10 figuras diseñadas a mano (niveles 1-5 con el tamaño de bloque actual 32x16 en una grilla de 13x6; niveles 6-10 con grillas más grandes acordes a `ZOOM_SCALE`), incluyendo bloques titanio crecientes (ausentes o mínimos en niveles 1-2, hasta 3-4 en niveles 9-10). Prueba manual: sin cambios visibles todavía; confirmar en consola que `LEVELS.length === 10` y cada nivel tiene celdas válidas.
2. Implementar `loadLevel(n)`: genera `state.bricks` a partir de `LEVELS[n - 1]` (incluyendo bloques `breakable: false` para titanio), fija `state.level = n` y `state.scale`, y reposiciona/redimensiona `paddle` y `ball` según la escala. Reemplaza la inicialización actual de un único nivel fijo; se llama con `loadLevel(1)` al iniciar partida desde la Start Screen. Prueba manual: iniciar partida y ver el nivel 1 igual que antes, sin regresiones.
3. Renderizar bloques titanio con `drawSprite(ctx, TITANIUM_SPRITE, ...)` y ajustar la colisión bola-bloque: si `brick.breakable === false`, la bola rebota sin marcar `exploding`, sin sumar puntos y sin `break-sound.mp3`; en su lugar reproduce `ball-bounce.mp3` con `playbackRate` más alto y volumen reducido. Prueba manual: cargar un nivel con titanio, golpearlo repetidamente, y confirmar que nunca se rompe y el sonido es distinto al rebote normal.
4. Ajustar la condición de fin de nivel: en vez de "todos los bloques muertos", chequear "todos los bloques con `breakable: true` están `alive: false`" (ignorando titanio). Al cumplirse, pasar a `state.screen = 'levelcomplete'`, salvo que `state.level === 10`, en cuyo caso pasa a `'victory'` como hoy. Prueba manual: romper todos los bloques rompibles de un nivel con titanio y confirmar que dispara la nueva pantalla sin necesidad de romper los titanio.
5. Implementar la pantalla "Nivel completado": overlay con el puntaje actual; Enter/click llama `loadLevel(state.level + 1)` sin resetear `score` ni `lives`, y vuelve a `state.screen = 'playing'`. Prueba manual: completar el nivel 1 y confirmar que continúa automáticamente al nivel 2 con el mismo puntaje y vidas.
6. Añadir el `<select>` de niveles en `index.html`, posicionado con CSS sobre el canvas y oculto salvo cuando `state.screen === 'paused'`; poblado con los 10 niveles y sincronizado en cada frame para reflejar `state.level` como opción seleccionada. Prueba manual: pausar (Esc) y ver aparecer el selector con el nivel actual marcado; reanudar (Esc) y verlo desaparecer.
7. Implementar el manejador `change` del selector: si el nivel elegido es distinto al actual, resetea `state.score = 0` y llama `loadLevel(nivelElegido)`, manteniendo `state.lives` y `state.screen = 'paused'`; si es el mismo nivel, no hace nada. Prueba manual: en el nivel 3 con puntaje > 0, pausar, elegir el nivel 5, reanudar, y confirmar que el puntaje volvió a 0 y el nivel 5 está cargado; repetir eligiendo el nivel activo y confirmar que no cambia nada.
8. Verificar el efecto de escala end-to-end: al cargar un nivel con `state.scale === ZOOM_SCALE`, bloques, paleta y bola se dibujan y colisionan al 70% de su tamaño base. Prueba manual: saltar vía el selector al nivel 6 y confirmar visualmente que todo se ve más chico y hay más bloques visibles que en niveles 1-5.
9. Confirmar vidas y high score a través de niveles: perder las 3 vidas en cualquier nivel dispara Game Over comparando `state.score` contra el high score, igual que antes. Prueba manual: perder todas las vidas en un nivel intermedio y confirmar que el puntaje de la racha se compara y persiste correctamente; en otra partida, completar el nivel 10 y ver la pantalla de Victoria.
10. Ajustar el reinicio de partida (desde Game Over/Victoria) para volver siempre a `loadLevel(1)` y `state.score = 0`, preservando `highScore`. Prueba manual: terminar una partida en un nivel distinto a 1, reiniciar, y confirmar que la nueva partida arranca en el nivel 1 con puntaje 0.

## Acceptance criteria

- [x] Existen 10 niveles con figuras de bloques distintas entre sí, usando los colores de bloque existentes.
- [x] Los niveles incluyen una cantidad creciente de bloques titanio (ausentes o mínimos en los primeros niveles, hasta 3-4 en los últimos), dibujados con el sprite `block_gray`.
- [x] Golpear un bloque titanio rebota la bola sin romperlo, sin sumar puntos, sin contar para completar el nivel, y reproduce un sonido de rebote distinto (más agudo y suave) al del rebote normal.
- [x] Completar un nivel (romper todos sus bloques rompibles) muestra una pantalla de "Nivel completado" y avanza automáticamente al siguiente nivel conservando puntaje y vidas.
- [x] Completar el nivel 10 muestra la pantalla de Victoria existente.
- [x] Las 3 vidas se mantienen acumuladas durante toda la partida, sin reiniciarse al pasar de nivel.
- [x] A partir del nivel 6, bloques, paleta y bola se ven y colisionan al 70% de su tamaño habitual, permitiendo ver más bloques en pantalla; este cambio de escala ocurre una sola vez y se mantiene del nivel 6 al 10.
- [x] Durante la pausa (Esc) aparece un `<select>` HTML con los 10 niveles disponibles, mostrando el nivel actual como seleccionado; fuera de pausa no es visible.
- [x] Elegir en el selector un nivel distinto al actual carga ese nivel y resetea el puntaje de la partida a 0; elegir el mismo nivel en el que ya se está no tiene ningún efecto.
- [x] Avanzar de nivel de forma natural (completándolo) nunca resetea el puntaje; solo un salto manual vía el selector lo hace.
- [x] El high score se sigue comparando y persistiendo (`arkanoid:highScore:v1`) usando el puntaje de la racha actual en Game Over/Victoria.
- [x] Reiniciar la partida desde Game Over/Victoria siempre vuelve al nivel 1 con puntaje 0, preservando el high score.
- [x] Abrir `index.html` directamente en el navegador sigue sin errores en consola.

## Decisions

- **Sí:** 10 niveles con patrones fijos diseñados a mano (`LEVELS` hardcodeado). Da control total sobre cada figura y es coherente con el nivel único hardcodeado de SPEC 01.
- **No:** generación procedural de niveles. Menos control artístico y mayor complejidad para un número de niveles (10) manejable a mano.
- **Sí:** los bloques titanio usan el sprite `block_gray`, reservado explícitamente para este propósito en las decisiones de SPEC 01.
- **Sí:** cantidad de titanio creciente con el nivel (de 0 a 3-4). Refuerza la progresión de dificultad sin saturar los niveles tempranos.
- **Sí:** vidas acumuladas durante toda la partida de 10 niveles, sin reiniciarse por nivel ni por salto manual. Es el comportamiento clásico de Arkanoid y evita "farmear" vidas cambiando de nivel.
- **No:** reiniciar vidas en cada nivel nuevo. Rompería la tensión de tener solo 3 vidas para toda la partida.
- **Sí:** el sonido de titanio reutiliza `ball-bounce.mp3` con `playbackRate` más alto y volumen reducido, en vez de un archivo de audio nuevo. Mantiene el principio "zero dependencies" de CLAUDE.md.
- **Sí:** efecto de zoom-out como cambio de escala instantáneo (no animado) al 70%, activo desde el nivel 6 en adelante, aplicado una sola vez. Cumple el pedido de "una sola vez después del nivel 5" sin la complejidad de animar una transición de cámara.
- **No:** animación gradual de zoom (cámara alejándose con transición). Fuera de alcance de esta spec.
- **Sí:** selector de niveles como `<select>` HTML nativo, visible solo durante la pausa. Es la opción más simple de implementar (sin UI custom en canvas) y evita mostrarlo mientras la bola está en movimiento.
- **No:** selector visible siempre en pantalla o solo en la Start Screen. El usuario prefirió que solo aparezca en pausa.
- **Sí:** seleccionar el mismo nivel en el que ya se está no tiene ningún efecto (no resetea puntaje ni recarga bloques).
- **Sí:** el puntaje se corta (resetea a 0) únicamente ante un salto manual de nivel vía el selector; el avance natural (completar nivel) preserva el puntaje acumulado.
- **Sí:** los 10 niveles están disponibles para seleccionar desde el inicio, sin sistema de desbloqueo progresivo. Coincide con el pedido explícito de poder "moverme entre niveles" libremente.
- **No:** persistir en `localStorage` el nivel alcanzado o el progreso de desbloqueo. Solo se mantiene el high score existente (`arkanoid:highScore:v1`); mantiene el alcance de esta spec acotado.
- **Sí:** pantalla intermedia "Nivel completado" entre niveles, con Enter/click para continuar. Sigue el mismo patrón de pantallas con confirmación manual que ya usa el juego (Start/Game Over/Victoria) desde SPEC 01.

## Risks

| Riesgo                                                                                                                             | Mitigación                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El factor de escala (`ZOOM_SCALE`) introduce errores de colisión si no se aplica consistentemente a `paddle`, `ball` y `bricks`.   | `loadLevel(n)` calcula y aplica `state.scale` en un único lugar; el paso 8 del plan incluye una prueba manual dedicada a verificar colisiones a escala reducida. |
| Saltar de nivel con el selector mientras la bola está en movimiento podría dejar la bola en una posición inválida del nuevo nivel. | El selector solo es visible y funcional durante `state.screen === 'paused'`; `loadLevel(n)` siempre reinicia la bola pegada a la paleta.                         |
| Diseñar 10 figuras de bloques a mano es propenso a errores de coordenadas (bloques superpuestos o fuera de canvas).                | Cada nivel se prueba manualmente al cargarlo (pasos 1 y 2 del plan) antes de continuar con el resto de la lógica.                                                |

## What is **not** in this spec

- Persistencia entre sesiones del nivel alcanzado o de un sistema de desbloqueo progresivo.
- Power-ups de cualquier tipo.
- Editor de niveles o generación procedural de niveles.
- Animación gradual de cámara para el efecto de zoom.
- Cambios de dificultad adicionales no descritos aquí (velocidad de bola, IA, etc.).
- Archivos de audio nuevos.
- Contenido más allá del nivel 10 (New Game+, niveles infinitos, etc.).

Cada uno de estos, si se implementa, va en su propia spec.
