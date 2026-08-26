# 01 — MVP visual: pantallas de Arcade Vault

- **Estado:** Approved
- **Depende de:** (ninguno — primer spec del proyecto)
- **Fecha:** 2026-08-25

**Objetivo:** Construir la interfaz visual completa del MVP de Arcade Vault (biblioteca, detalle de juego, reproductor simulado, salón de la fama y autenticación) como rutas reales de Next.js App Router, reutilizando el tema neón ya existente en `app/globals.css`, sin implementar lógica de juego real.

## Alcance

**Incluye:**

- 5 pantallas convertidas de `references/templates/*.jsx` a rutas reales de Next.js App Router (TypeScript, App Router idiomático):
  - `/` — Biblioteca (`biblioteca.jsx`): hero, buscador, chips de categoría, grid de `GameCard`.
  - `/games/[id]` — Detalle de juego (`detalle.jsx`): portada, tags, descripción, stats, leaderboard determinista por juego.
  - `/games/[id]/play` — Reproductor (`reproductor.jsx`): HUD (jugador/puntuación/vidas/nivel), pantalla CRT decorativa, simulación de puntaje con temporizador, pausa, modal de fin de partida con guardado de puntuación.
  - `/hall-of-fame` — Salón de la Fama (`salon.jsx`): tabs por juego, podio (oro/plata/bronce), tabla de puntuaciones, fila "tu mejor marca" cuando hay sesión.
  - `/login` — Autenticación (`auth.jsx`): tabs iniciar sesión / crear cuenta, botón de invitado, botones sociales decorativos.
- `Nav` (`nav.jsx`) como componente compartido: resalta la ruta activa según la URL, muestra sesión activa o botón de login, menú móvil (<840px), contador de créditos estático.
- Sesión de usuario y puntuaciones guardadas en `localStorage`, replicando el comportamiento de `app.jsx` (`av_user`, `av_scores`), sin backend.
- Datos mock (`data.jsx`: `GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados literalmente a TypeScript.
- Todos los estados visuales ya presentes en los templates: resultados de búsqueda vacíos, pausa, fin de partida, puntuación guardada (toast), tabs activos, fila del usuario en el salón.
- Metadata de `app/layout.tsx` actualizada (título "Arcade Vault" en vez del scaffold de `create-next-app`).

**No incluye:**

- Lógica de juego real (colisiones, controles, niveles jugables). El reproductor sigue siendo una simulación visual (puntaje incremental automático), igual que en el template.
- Backend, API, base de datos o autenticación real (passwords, validación, OAuth real de Google/GitHub).
- Sistema de créditos funcional (el contador "CRÉDITOS · 03" queda estático, como en el template).
- Multijugador, sonido, i18n (la app es 100% en español), tests automatizados (no hay test runner configurado).
- Página de perfil/edición de cuenta.
- `references/templates/Arcade Vault.html` y `styles.css` no se usan como archivos servidos — son solo referencia; el CSS ya vive en `app/globals.css`.

## Modelo de datos

Todo el "modelo de datos" es mock y vive en cliente (sin persistencia real más allá de `localStorage`).

**`lib/data.ts`**
```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS ya definida en globals.css (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export const GAMES: Game[];
export const CATS: string[];
export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): ScoreRow[];
```
Contenido idéntico (mismos 8 juegos, mismos textos en español, mismo algoritmo pseudo-aleatorio con seed) al de `references/templates/data.jsx`.

**`lib/session-context.tsx`**
```ts
export interface Session {
  name: string;
}

export interface ScoreEntry {
  game: string;
  score: number;
  name: string;
  at: number;
}

// Provider + hook, respaldados por localStorage:
//   av_user   -> Session | null
//   av_scores -> ScoreEntry[]
export function SessionProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useSession(): {
  user: Session | null;
  login: (u: Session | null) => void;
  signOut: () => void;
  saveScore: (entry: Omit<ScoreEntry, "at">) => void;
};
```

No hay versionado de esquema: son datos mock/no críticos, sin migraciones.

## Plan de implementación

1. Crear `lib/data.ts` con los tipos `Game`/`ScoreRow` y los datos (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) portados desde `data.jsx`.
2. Crear `lib/session-context.tsx` con `SessionProvider`/`useSession`, leyendo y escribiendo `av_user`/`av_scores` en `localStorage`.
3. Crear `components/nav.tsx` (client, usa `usePathname` para resaltar ruta activa) y `components/app-shell.tsx` (client, envuelve `SessionProvider` + `Nav` + `children` + footer). Actualizar `app/layout.tsx` para usar `AppShell` y cambiar el título a "Arcade Vault".
4. Reemplazar `app/page.tsx` por la pantalla Biblioteca (buscador + chips + grid), con `components/game-card.tsx` como componente compartido (client, por el efecto de tilt con mouse).
5. Crear `app/games/[id]/page.tsx` (Detalle) — puede ser Server Component; usar `notFound()` de Next.js si el `id` no existe en `GAMES`.
6. Crear `app/games/[id]/play/page.tsx` (Reproductor, client) — HUD, CRT, simulación de puntaje, pausa, modal de fin de partida con `useSession().saveScore`.
7. Crear `app/hall-of-fame/page.tsx` (client, por el estado de tabs) — podio, tabla, fila de usuario si hay sesión.
8. Crear `app/login/page.tsx` (client) — tabs, invitado, sociales decorativos, usando `useSession().login` y redirigiendo a `/` tras autenticar.
9. Pase final: revisar responsive en mobile (<840px), correr `npm run lint` y `npm run build`.

Cada paso deja la app funcional y desplegable (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [ ] `npm run dev` sirve `/` con la biblioteca: hero, buscador funcional, chips de categoría filtran, grid de juegos.
- [ ] Buscar un término sin resultados muestra el estado "NO HAY RESULTADOS".
- [ ] Cada `GameCard` navega a `/games/[id]`.
- [ ] `/games/id-inexistente` muestra la página not-found de Next.js.
- [ ] `/games/[id]` muestra el leaderboard determinista (mismo id → mismas puntuaciones en cada visita).
- [ ] "JUGAR AHORA" navega a `/games/[id]/play`.
- [ ] En `/games/[id]/play` el puntaje sube solo con un temporizador; "PAUSA" detiene el incremento y lo revierte "REANUDAR"; "FIN" abre el modal de fin de partida.
- [ ] Guardar la puntuación en el modal persiste en `localStorage` (`av_scores`) y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/hall-of-fame` cambia de tabs por juego (podio + tabla se actualizan); la fila "tu mejor marca" solo aparece con sesión iniciada.
- [ ] `/login` permite iniciar sesión, crear cuenta o entrar como invitado; en los tres casos guarda `av_user` en `localStorage` y redirige a `/`.
- [ ] El `Nav` refleja la sesión activa (nombre de usuario o botón "Iniciar Sesión"), resalta la ruta activa, y el menú móvil funciona por debajo de 840px de ancho.
- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Todas las pantallas están en español y usan únicamente clases ya definidas en `app/globals.css` (sin CSS nuevo salvo ajustes menores inevitables de integración).

## Decisiones tomadas y descartadas

- **Rutas reales de Next.js App Router** en vez de replicar el ruteo por hash de `app.jsx`. Es lo idiomático para este proyecto (App Router) y da URLs navegables/compartibles. *Descartado:* ruteo por hash con una sola ruta `/`.
- **Segmentos de URL en inglés** (`/games/[id]`, `/games/[id]/play`, `/hall-of-fame`, `/login`) por decisión explícita del usuario, aunque el resto de la UI esté en español.
- **El reproductor mantiene la simulación completa** (temporizador de puntaje, pausa, modal de fin de partida) por decisión explícita del usuario: se considera una "maqueta animada", no lógica de juego real, y por tanto cae dentro de "parte visual".
- **Sesión y puntuaciones en `localStorage` sin backend**, replicando `app.jsx` 1:1 — no se introduce autenticación real.
- **`app/`, `components/` y `lib/` movidos bajo `src/`** (`src/app`, `src/components`, `src/lib`), siguiendo el patrón común de Next.js para separar código de aplicación de los archivos de configuración que quedan en la raíz (`package.json`, `next.config.ts`, `tsconfig.json`, `public/`). El alias `@/*` en `tsconfig.json` se actualizó a `./src/*`. *Decisión revisada durante la implementación* (Paso 3) a pedido explícito del usuario; reemplaza la decisión original de "`components/` y `lib/` en la raíz del repo sin `src/`".
- **Datos mock portados literalmente** desde `data.jsx` (mismos 8 juegos, mismos textos), sin agregar ni quitar contenido.
- **`notFound()` de Next.js para ids de juego inexistentes**, en vez de retornar `null` como hace el template — decisión propia, más idiomática en App Router y evita una pantalla en blanco silenciosa.
- **Botones sociales (Google/GitHub) decorativos**, sin `onClick` funcional — igual que en el template.

## Riesgos identificados

- La sesión (`av_user`) solo existe en `localStorage`, que no está disponible durante el render en servidor. El `Nav` debe leerla en un efecto de cliente; esto puede causar un parpadeo breve mostrando "Iniciar Sesión" antes de hidratar la sesión real. Aceptable para un MVP visual sin backend.
