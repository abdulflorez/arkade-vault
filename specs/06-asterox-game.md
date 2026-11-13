# 06 — ASTEROX: primer juego real de la plataforma (port de `02-asteroids`)

- **Estado:** Borrador
- **Depende de:** SPEC 04 (supabase-infra-auth), SPEC 05 (scores-supabase — este spec se implementa después del 05)
- **Fecha:** 2026-11-11

**Objetivo:** Portar a TypeScript el juego de `references/started_games/02-asteroids/` como **ASTEROX**, el primer juego jugable de Arcade Vault, montado en un canvas dentro del CRT de `/games/asterox/play` y comunicado con el `GamePlayer` de React por eventos.

## Por qué existe este spec

Hoy `/games/[id]/play` muestra un simulador: una escena CSS decorativa y una puntuación aleatoria que sube sola. La entrada `rocas` de `src/lib/data.ts` era un placeholder del mockup. Este spec la **sustituye por completo** por el juego de la referencia, ya terminado (canvas, power-ups, Bomba Nova), y deja lista la forma de montar los juegos reales siguientes (`03-super-tetris`, `04-arkanoid`) mediante un registro.

## Alcance

**Incluye:**

- **Identidad del juego:** el catálogo deja de tener `rocas` y pasa a tener **ASTEROX** (`id: "asterox"`). El nombre "Asteroids" de la referencia no se usa en la plataforma, porque es la marca del arcade original. La mecánica y el código del usuario se portan íntegros.
  - `short` y `long` se reescriben a partir del `README.md` de la referencia: espacio toroidal, asteroides que se parten (grande → mediano → pequeño), 6 power-ups y la Bomba Nova. Se elimina la mención a los OVNIs.
  - `cat: "SHOOTER"`, `color: "yellow"`. Sin `best` ni `plays`: el spec 05 los eliminó de `Game` y ahora salen de la vista `game_stats`. Mientras ASTEROX no tenga marcas, se ve el estado vacío del spec 05 (`—`, `0`, `SIN MARCAS AÚN · SÉ EL PRIMERO`).
  - **Limpieza de puntuaciones de `rocas`:** migración `supabase/migrations/<timestamp>_delete_rocas_scores.sql` con `delete from public.scores where game_id = 'rocas';`, aplicada con el MCP. Borra las filas que guardó el simulador de ROCAS durante el spec 05.
  - La clase CSS `.cover-rocas` se renombra a `.cover-asterox`, con las mismas reglas.
  - `favicon.svg` de la referencia → `public/games/asterox/icon.svg`. Se muestra como icono del juego en `/games/asterox`.
- **Motor en TypeScript** (`src/games/asterox/engine.ts`), port de `game.js`:
  - Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y la lógica de `update`/`draw`, sin variables globales. Todo el estado vive en una instancia de `AsteroxEngine`, que recibe el `<canvas>` y unos callbacks.
  - **Jugabilidad idéntica a la referencia:** mundo lógico de 800×600, 3 vidas, invencibilidad de 3 s al reaparecer, puntos 20/50/100, 4 asteroides al empezar y `3 + nivel` en cada nivel siguiente, `POWERUP_DROP_CHANCE = 0.15`, `NOVA_MAX = 2`, `LASER_RANGE = 550` y las mismas duraciones, velocidades, radios y física.
  - **Paleta neón** con los tokens de la plataforma (`--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`, `--ink #e6e9ff`) y glow (`shadowBlur`). Se mantiene el estilo wireframe. Asignación: nave cyan, asteroides magenta, balas y láser amarillo, power-ups verde, partículas del color del objeto que explota, llama del propulsor amarilla/magenta. Fondo `--bg #0a0a0f`.
  - **HUD del canvas reducido:** solo dibuja lo propio del juego, es decir, los power-ups activos (abajo a la izquierda) y `BOMBA [B] xN` (abajo a la derecha). Puntuación, nivel y vidas **no** se dibujan en el canvas.
  - Se elimina el overlay `GAME OVER` del canvas y el reinicio con Espacio.
  - **Modo demo ("attract mode")** antes de la partida: asteroides neón a la deriva, sin nave ni puntuación, con el texto parpadeante `PULSA ESPACIO O HAZ CLIC PARA JUGAR`. Espacio o clic en el canvas empieza la partida.
  - **Teclado:** `←` `→` rotar, `↑` propulsar, `Espacio` disparar o láser, `B` Bomba Nova, `P` / `Esc` pausar y reanudar. Los listeners se registran al crear el motor y se quitan en `destroy()`. Se ignoran las teclas cuyo `event.target` sea un `input` o `textarea`, y todas las teclas en la fase `gameover`. `preventDefault` solo se aplica a Espacio y flechas durante `playing`, `dead` y `attract`.
  - **Pausa automática** al ocultarse la pestaña (`visibilitychange`) o al perder el foco la ventana (`blur`), solo en las fases `playing` o `dead`.
  - Al pausar se congela el bucle. Al reanudar se reinicia `lastTime`, para que el `dt` no salte. El tope de `dt` de 0,05 s se mantiene.
- **Componente React** `src/games/asterox/asterox-game.tsx` (`"use client"`):
  - Monta el `<canvas>` y crea el motor en `useEffect`. En la limpieza llama a `destroy()`, que cancela el `requestAnimationFrame` y quita los listeners.
  - Recibe un `ref`/handle imperativo (`start`, `pause`, `resume`, `end`) y reenvía los callbacks del motor al `GamePlayer`.
  - Escala: el canvas mantiene la resolución lógica de 800×600, multiplicada por `devicePixelRatio` para verse nítido, y por CSS ocupa el 100 % del ancho del CRT con `aspect-ratio: 4 / 3`.
- **Registro de juegos** `src/games/registry.ts`: relaciona cada `id` con su componente (`{ asterox: AsteroxGame }`). Los juegos que no están en el registro siguen mostrando el simulador actual.
- **`src/components/game-player.tsx`** adaptado:
  - Si `game.id` está en el registro, monta el juego real dentro de `.crt-screen` en lugar de `.game-arena`, y el HUD (`Puntuación`, `Vidas`, `Nivel`) se alimenta con `onStats`. Vidas = `"♥ "` repetido según las vidas actuales. Si no está, se mantiene exactamente el comportamiento simulado de hoy.
  - **PAUSA/REANUDAR** llama a `pause()`/`resume()`. El overlay `EN PAUSA` existente se muestra cuando el motor emite la fase `paused`, ya sea por botón, por `P`/`Esc` o por la pausa automática, y su texto pasa a `PULSA P O REANUDAR PARA CONTINUAR`. En el modo demo, el botón PAUSA está deshabilitado.
  - **FIN** llama a `end()`. El motor emite `onGameOver(score)` con la puntuación actual y se abre el modal.
  - **Game over** (vidas = 0 o FIN): se abre el modal existente `FIN DEL JUEGO` con la puntuación final real.
  - **JUGAR DE NUEVO** cierra el modal y llama a `start()`: empieza una partida nueva directamente, sin pasar por el modo demo.
  - **Guardar puntuación:** el modal del spec 05 se reutiliza tal cual. Con sesión, `GUARDAR PUNTUACIÓN` hace `await useSession().saveScore({ game: "asterox", score })` con la puntuación final real del motor (firma asíncrona del spec 05, que devuelve `Promise<SaveScoreResult>`), con sus estados `GUARDANDO...`, toast y error con reintento. Sin sesión, aparece el aviso `INICIA SESIÓN PARA GUARDAR TU MARCA`. Este spec no cambia la lógica de guardado, solo la alimenta con la puntuación real.
- **`/games/asterox`** (detalle): muestra `icon.svg` junto al título. El resto de la página no cambia.
- **`src/app/globals.css`:** renombrar `.cover-rocas` → `.cover-asterox` y agregar una clase mínima para el canvas (`.game-canvas`: `display: block; width: 100%; aspect-ratio: 4 / 3;`) y para el icono del detalle (`.detail-icon`).

**No incluye:**

- Cambios a la persistencia de puntuaciones, a los rankings o a las vistas `game_leaderboard`/`game_stats` (ya resueltos en el **spec 05**).
- Controles táctiles o botones en pantalla para móvil (quedan para un spec futuro). En móvil se ve el modo demo, pero no se puede jugar sin teclado. La etiqueta `TECLADO / TÁCTIL` del detalle no se toca en este spec.
- Sonido y música (la referencia no los tiene).
- Cambios de balance o jugabilidad respecto a `game.js`.
- Portar `03-super-tetris` y `04-arkanoid` (cada uno en su propio spec, usando el registro).
- Cambiar el simulador de los otros 7 juegos del catálogo.
- Mundo de juego de tamaño dinámico y pantalla completa.
- Anti-trampas, es decir, validar la puntuación contra la partida real (spec futuro; el spec 05 solo valida tipo, rango, juego y sesión).

## Modelo de datos

No hay persistencia nueva en este spec. Las estructuras nuevas son las del contrato entre el motor y React:

```ts
// src/games/asterox/engine.ts
export type AsteroxPhase = "attract" | "playing" | "dead" | "paused" | "gameover";

export interface AsteroxStats {
  score: number;
  lives: number; // 0..3
  level: number; // 1..n
}

export interface AsteroxCallbacks {
  onStats: (stats: AsteroxStats) => void; // se emite solo cuando cambia algún valor
  onPhaseChange: (phase: AsteroxPhase) => void;
  onGameOver: (finalScore: number) => void;
}

export class AsteroxEngine {
  constructor(canvas: HTMLCanvasElement, callbacks: AsteroxCallbacks);
  start(): void; // partida nueva (desde attract o tras gameover)
  pause(): void; // solo en playing/dead
  resume(): void; // solo en paused
  end(): void; // fuerza gameover con la puntuación actual
  destroy(): void; // cancela rAF y quita listeners
}
```

```ts
// src/games/registry.ts
import type { ComponentType, Ref } from "react";

export interface GameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  end(): void;
}

export interface RealGameProps {
  ref?: Ref<GameHandle>;
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  onPhaseChange: (phase: string) => void;
  onGameOver: (finalScore: number) => void;
}

export const GAME_REGISTRY: Record<string, ComponentType<RealGameProps>>;
```

```ts
// src/lib/data.ts — interfaz Game
export interface Game {
  // ...campos existentes
  icon?: string; // nuevo, opcional: ruta pública del icono, p. ej. "/games/asterox/icon.svg"
}
```

Fases y transiciones del motor:

| Desde              | Evento                                        | Hacia                            |
| ------------------ | --------------------------------------------- | -------------------------------- |
| `attract`          | Espacio / clic en canvas / `start()`          | `playing`                        |
| `playing`          | colisión sin escudo con vidas > 1             | `dead` (2 s) → `playing`         |
| `playing` / `dead` | última vida perdida o `end()`                 | `gameover` (emite `onGameOver`)  |
| `playing` / `dead` | `pause()`, `P`, `Esc`, `blur`, pestaña oculta | `paused`                         |
| `paused`           | `resume()`, `P`, `Esc`                        | fase previa (`playing` o `dead`) |
| `gameover`         | `start()` (JUGAR DE NUEVO)                    | `playing`                        |

## Plan de implementación

1. **Ficha del juego:** en `src/lib/data.ts`, sustituir la entrada `rocas` por `asterox` (`title: "ASTEROX"`, `short`/`long` nuevos, `cover: "cover-asterox"`, `icon: "/games/asterox/icon.svg"`) y agregar `icon?` a `Game`. Renombrar `.cover-rocas` → `.cover-asterox` en `globals.css`. Copiar `favicon.svg` → `public/games/asterox/icon.svg`. Mostrar el icono en `src/app/games/[id]/page.tsx` cuando exista. Escribir y aplicar con el MCP la migración `<timestamp>_delete_rocas_scores.sql`, y verificar con `execute_sql` que no quedan filas con `game_id = 'rocas'`. La app sigue funcionando con el simulador en `/games/asterox/play`.
2. **Motor:** crear `src/games/asterox/engine.ts` portando `game.js` a clases TS tipadas, sin globals, con la API y las fases del Modelo de datos. Mantener todos los valores numéricos de la referencia. Paleta neón y HUD del canvas reducido. Modo demo. Teclado con limpieza en `destroy()`. Pausa automática.
3. **Componente:** crear `src/games/asterox/asterox-game.tsx`: canvas escalado (DPR + `aspect-ratio`), creación y destrucción del motor en `useEffect`, handle imperativo y reenvío de callbacks. Agregar `.game-canvas` y `.detail-icon` a `globals.css`.
4. **Registro:** crear `src/games/registry.ts` con `{ asterox: AsteroxGame }`.
5. **GamePlayer:** si el juego está en el registro, montar el componente real dentro del CRT, alimentar el HUD con `onStats`, conectar PAUSA/REANUDAR/FIN al handle, mostrar el overlay de pausa según la fase, abrir el modal en `onGameOver` con la puntuación real, conectar JUGAR DE NUEVO a `start()` y deshabilitar PAUSA en el modo demo. Si no está en el registro, el simulador sigue sin cambios. El modal de guardado del spec 05 recibe la puntuación final del motor y llama a `saveScore` asíncrono con `game: "asterox"`.
6. **Pase final:** jugar una partida completa en `/games/asterox/play` (todos los power-ups, Bomba Nova, cambio de nivel, game over, guardar y jugar de nuevo). Navegar a otra ruta y volver para confirmar que no quedan bucles ni listeners duplicados. Revisar en mobile (<840px) que el canvas escala sin scroll horizontal. Correr `npm run lint` y `npm run build`.

Cada paso deja la app funcional (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [ ] `src/lib/data.ts` no contiene la entrada `rocas` y contiene `asterox` con título `ASTEROX`, la descripción nueva (sin OVNIs) y `icon: "/games/asterox/icon.svg"`.
- [ ] `/games/asterox` muestra la portada `cover-asterox` y el icono `icon.svg` junto al título. `/games/rocas` responde 404.
- [ ] `supabase/migrations/` contiene `<timestamp>_delete_rocas_scores.sql`, aplicada en el proyecto remoto, y `select count(*) from public.scores where game_id = 'rocas'` devuelve `0`.
- [ ] Antes de la primera marca, `/games/asterox`, su tarjeta en `/games` y `/hall-of-fame?game=asterox` muestran el estado vacío del spec 05.
- [ ] El nombre "Asteroids" no aparece en ningún archivo de `src/` ni de `public/`.
- [ ] Al entrar en `/games/asterox/play`, el CRT muestra el modo demo (asteroides neón moviéndose sin nave) con `PULSA ESPACIO O HAZ CLIC PARA JUGAR`, y el botón PAUSA está deshabilitado.
- [ ] Espacio o clic en el canvas empieza la partida: aparece la nave cyan en el centro con 3 s de parpadeo y 4 asteroides grandes.
- [ ] Destruir asteroides suma 20/50/100 según su tamaño, y el valor del HUD `Puntuación` de React coincide con la puntuación interna del motor.
- [ ] El HUD de React muestra vidas (`♥` por vida restante) y nivel (`01`, `02`...) actualizados en tiempo real. El canvas no dibuja puntuación, nivel ni vidas.
- [ ] Los 6 power-ups (E, T, R, H, L, N) aparecen al destruir asteroides, se recogen tocándolos y producen el mismo efecto y la misma duración que en la referencia. El canvas muestra los power-ups activos y `BOMBA [B] xN`.
- [ ] `B` detona la Bomba Nova si hay en el inventario (máximo 2).
- [ ] Al vaciar la pantalla de asteroides se pasa al nivel siguiente con `3 + nivel` asteroides grandes.
- [ ] PAUSA, `P` y `Esc` pausan y reanudan, y muestran u ocultan el overlay `EN PAUSA`. Al reanudar, nada salta de posición.
- [ ] Cambiar de pestaña o hacer clic fuera de la ventana durante la partida la pausa automáticamente.
- [ ] Perder la última vida, o pulsar FIN, abre el modal `FIN DEL JUEGO` con la puntuación final real.
- [ ] Con el modal abierto, pulsar Espacio, las flechas o `B` no dispara ni mueve la nave.
- [ ] Con sesión, `GUARDAR PUNTUACIÓN` crea una fila en `public.scores` con `game_id = 'asterox'` y la puntuación final real. Después de eso, la marca aparece en `/games/asterox` y en `/hall-of-fame?game=asterox`.
- [ ] Sin sesión, el modal muestra `INICIA SESIÓN PARA GUARDAR TU MARCA` (comportamiento del spec 05) y no guarda nada.
- [ ] JUGAR DE NUEVO cierra el modal y empieza una partida nueva (puntuación 0, 3 vidas, nivel 1) sin pasar por el modo demo.
- [ ] Salir con SALIR o con el Nav y volver a entrar no duplica el bucle ni los listeners: la velocidad del juego es la misma y cada disparo con Espacio produce una sola bala.
- [ ] Fuera de `/games/asterox/play`, Espacio y las flechas hacen scroll normal en la página.
- [ ] Los otros 7 juegos siguen mostrando el simulador en `/games/[id]/play`, sin cambios.
- [ ] En mobile (<840px) el canvas ocupa el ancho del CRT con relación 4:3, sin scroll horizontal, y se ve nítido en pantallas de alta densidad.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Numerado como 06, después del spec 05 (puntuaciones en BD):** decisión explícita del usuario ("ponlo en cola y luego ejecutamos en orden"). El spec 05 (`05-scores-supabase.md`) ya está escrito y se implementa antes que este. _Descartado:_ tomar el número 05 y guardar en `localStorage`.
- **Nombre ASTEROX en vez de "Asteroids":** el nombre de la referencia es la marca del arcade original, así que se eligió un nombre propio con un sonido parecido. Decisión del usuario entre varias opciones. _Descartados:_ ROCAS ("suena horrible", según el usuario), ASTRO NOVA, ASTRO BLAST, LLUVIA ASTRAL.
- **ASTEROX sustituye por completo a `rocas`, no la "conecta":** el usuario aclaró que ROCAS era un placeholder distinto. Cambian id, título y descripción. Las URL `/games/rocas*` dejan de existir (aceptable, porque no hay usuarios reales).
- **Favicon de la referencia como icono del juego** en el detalle: decisión explícita del usuario.
- **Port a TypeScript con una API de instancia**, en vez de cargar `game.js` tal cual desde `public/`: evita el estado global y los listeners colgados al navegar, y permite comunicarse con React. Decisión explícita del usuario.
- **Jugabilidad idéntica a la referencia:** decisión explícita del usuario ("es solo implementarlo"). Solo cambian los colores, el HUD y el flujo de inicio y fin.
- **Paleta neón de la plataforma** en lugar del blanco y negro original: decisión explícita del usuario, para encajar con Arcade Vault.
- **HUD de la plataforma (React) para puntuación, vidas y nivel**, alimentado por eventos del motor. El canvas solo dibuja power-ups y bomba: decisión explícita del usuario. _Descartado:_ un HUD duplicado.
- **Modo demo en canvas antes de jugar:** propuesta del usuario ("mostrar el juego simulado hasta que le dan jugar"), concretada como el attract mode clásico. _Descartados:_ imagen o GIF estático (requiere producir un asset) y reutilizar el simulador CSS.
- **Fin de partida con el modal de la plataforma:** decisión explícita del usuario. Se quitan el overlay `GAME OVER` y el reinicio con Espacio de la referencia.
- **JUGAR DE NUEVO empieza directamente**, sin volver al modo demo: decisión explícita del usuario.
- **Controles: teclado original + `P`/`Esc` para pausar.** Los controles táctiles quedan para otro spec: decisión explícita del usuario.
- **Pausa automática al perder el foco o al ocultarse la pestaña, y FIN termina la partida:** decisión explícita del usuario.
- **Mundo lógico fijo de 800×600 escalado por CSS (4:3) con DPR:** decisión explícita del usuario. La dificultad no depende del tamaño de pantalla. _Descartado:_ un mundo dinámico.
- **Registro `id → componente`, con el simulador para los juegos no registrados:** decisión explícita del usuario. Prepara la entrada de `03-super-tetris` y `04-arkanoid`. _Descartados:_ `if (game.id === ...)` dentro de `GamePlayer` y mostrar "PRÓXIMAMENTE".
- **El guardado de la puntuación lo define el spec 05:** este spec solo entrega `game: "asterox"` y la puntuación final real al `saveScore` asíncrono del spec 05 (`Promise<SaveScoreResult>`). Reutiliza su modal (username, `GUARDANDO...` y aviso para invitados) sin cambios.
- **Borrar las puntuaciones de `rocas` con una migración versionada:** sigue la regla del spec 05 de que, al reemplazar un simulador por su juego real, su spec limpia las filas de su `game_id`. Se hace con una migración para que quede registrada en git. _Descartado:_ dejar las filas huérfanas, que no se verían pero ensuciarían la tabla.
- **`best`/`plays` fuera de la ficha de ASTEROX:** el spec 05 los eliminó de `Game`. Las estadísticas salen de `game_stats`.

## Riesgos identificados

| Riesgo                                                                                                                               | Mitigación                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementar el 06 antes que el 05: no existirían `scores`, `game_stats` ni el `saveScore` asíncrono.                                 | Orden obligatorio: el 05 tiene que estar en estado `Implementado` antes de correr `/spec-impl 06-asterox-game`.                                                             |
| React 19 en desarrollo monta, desmonta y vuelve a montar los efectos (Strict Mode): pueden quedar dos bucles o listeners duplicados. | `destroy()` cancela el `requestAnimationFrame` y quita todos los listeners. Un criterio de aceptación verifica que no hay balas ni velocidad duplicadas.                    |
| Los listeners de teclado globales roban Espacio y flechas al campo de nombre del modal o al resto de la página.                      | Ignorar los eventos cuyo target sea `input`/`textarea` y los de la fase `gameover`. `preventDefault` solo en las fases de juego. `destroy()` los quita al salir de la ruta. |
| `shadowBlur` (glow) en muchos objetos puede bajar los FPS en equipos modestos.                                                       | Aplicar el glow solo a la nave, las balas y el láser. Los asteroides y las partículas, con poco o ningún blur. Revisarlo en el pase final.                                  |
| Salto de física al reanudar tras una pausa larga (un `dt` enorme).                                                                   | Reiniciar `lastTime` al reanudar y mantener el tope de `dt` de 0,05 s de la referencia.                                                                                     |
| En móvil el juego no se puede jugar (sin teclado) y el detalle dice `TECLADO / TÁCTIL`.                                              | Aceptado y documentado: los controles táctiles van en un spec futuro. En móvil se ve el modo demo.                                                                          |
| Puntuaciones de `rocas` guardadas en `public.scores` por el simulador durante el spec 05.                                            | La migración `delete_rocas_scores` las borra. Un criterio de aceptación verifica que el conteo queda en `0`.                                                                |
| La migración de limpieza borra datos de forma irreversible.                                                                          | Solo afecta a `game_id = 'rocas'`, un juego que deja de existir y cuyas marcas eran del simulador (puntuación aleatoria).                                                   |
