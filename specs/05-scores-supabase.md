# 05 — Puntuaciones en Supabase: guardado con sesión y rankings reales

- **Estado:** Implementado
- **Depende de:** SPEC 04 (supabase-infra-auth)
- **Fecha:** 2026-11-11
- **Implementado:** 2026-11-12

**Objetivo:** Guardar en Supabase las puntuaciones de los jugadores con sesión mediante una Server Action, y reemplazar todos los rankings y estadísticas mock (Salón de la Fama, detalle del juego y tarjetas del catálogo) por datos reales leídos en el servidor.

## Por qué existe este spec

El spec 04 dio identidad real (Supabase Auth + `public.profiles`), pero `saveScore` sigue escribiendo en `localStorage` (`av_scores`), y todos los rankings salen de `seededScores()` o de los campos fijos `best`/`plays` de `src/lib/data.ts`. Este spec cierra ese hueco, que el spec 04 dejó reservado como "spec 05". Va **antes** del spec 06 (ASTEROX), que usará este guardado.

## Alcance

**Incluye:**

- **Migración** `supabase/migrations/<timestamp>_create_scores.sql`, aplicada con el MCP de Supabase y guardada en el repo:
  - Tabla `public.scores` (ver Modelo de datos): una fila por partida guardada.
  - Índice `(game_id, score desc)`.
  - RLS activado: `select` para `anon` y `authenticated`; `insert` solo para `authenticated` con `user_id = (select auth.uid())`. Sin políticas de `update`/`delete`.
  - Vista `public.game_leaderboard` (`security_invoker = true`): **mejor marca por jugador y juego**, con `username` y `rank`.
  - Vista `public.game_stats` (`security_invoker = true`): `best` (máximo) y `plays` (conteo de puntuaciones guardadas) por juego.
- Tipos regenerados con el MCP en `src/lib/supabase/database.types.ts` (incluyen `scores` y las dos vistas).
- **Server Action** `src/app/games/actions.ts` → `saveScore({ gameId, score })`:
  - Exige sesión (`auth.getUser()`). Sin sesión devuelve error sin insertar.
  - Valida que `gameId` exista en `GAMES` (`src/lib/data.ts`) y que `score` sea un entero entre `0` y `99 999 999`.
  - Inserta `{ user_id, game_id, score }` con el cliente de servidor y llama a `revalidatePath("/", "layout")`.
  - Devuelve `{ ok: true }` o `{ ok: false, error: string }`, con mensajes breves en español.
- **Lecturas en el servidor** `src/lib/scores.ts` (solo servidor, con el cliente de `src/lib/supabase/server.ts`):
  - `getLeaderboard(gameId, limit)`: filas de `game_leaderboard` ordenadas por `rank`.
  - `getUserBest(gameId, userId)`: fila del usuario en `game_leaderboard` (rango real, mejor marca y fecha) o `null`.
  - `getGameStats()`: `Record<gameId, { best: number; plays: number }>` desde `game_stats`.
- **`src/lib/session-context.tsx`:** `saveScore` deja de usar `localStorage` y pasa a llamar a la Server Action. Su firma cambia a `(entry: { game: string; score: number }) => Promise<SaveScoreResult>`. Se elimina la constante `av_scores` y el tipo `ScoreEntry` de `localStorage`.
- **Modal `FIN DEL JUEGO`** (`src/components/game-player.tsx`):
  - **Con sesión:** se quita el input de iniciales. Se muestra `JUGADOR: {username}` y el botón `GUARDAR PUNTUACIÓN`. Al pulsarlo, el botón se deshabilita con `GUARDANDO...`. Si sale bien, aparece el toast existente `▸ PUNTUACIÓN GUARDADA_`. Si falla, `.shake` + `.form-error` con el mensaje, y el botón vuelve a estar disponible para reintentar.
  - **Sin sesión (invitado):** en lugar del input y el botón de guardar se muestra `INICIA SESIÓN PARA GUARDAR TU MARCA` y un botón `INICIAR SESIÓN` → `/login`. JUGAR DE NUEVO y VOLVER AL VAULT siguen igual.
  - El simulador puede guardar: cualquier `id` de `GAMES` es válido. Las filas generadas así se pueden borrar después por SQL (ver Decisiones).
- **Salón de la Fama** (`src/app/hall-of-fame/page.tsx`) pasa a **Server Component**:
  - La pestaña activa se lee de `searchParams.game`. Si falta o no es válida, se usa el primer juego de `GAMES`. Las pestañas pasan a ser `Link` a `?game={id}`, con la clase `.chip.active` de hoy.
  - Podio (top 3) y tabla (top 12) desde `getLeaderboard(game, 12)`, con la fecha de la marca en formato `dd/mm/aaaa`.
  - `TU MEJOR MARCA EN {título}` (solo con sesión): rango real, mejor marca y fecha de `getUserBest`, aunque esté fuera del top 12. Si el usuario no tiene marcas en ese juego: `AÚN SIN MARCA · JUEGA AHORA`, con enlace a `/games/{id}`.
- **Detalle del juego** (`src/app/games/[id]/page.tsx`): leaderboard top 10 desde `getLeaderboard(id, 10)`. `Mejor global` y `Partidas` salen de `getGameStats()`.
- **Catálogo** (`/games`):
  - `src/app/games/page.tsx` pasa a Server Component que llama a `getGameStats()`.
  - La lógica de búsqueda y filtros actual se mueve, sin cambios, a un componente cliente nuevo `src/components/games-browser.tsx`.
  - `GameCard` recibe `best: number | null` como prop.
- **Estado vacío arcade** cuando un juego no tiene puntuaciones:
  - Leaderboards (detalle y tabla del Salón): `SIN MARCAS AÚN · SÉ EL PRIMERO`.
  - Podio: slots con nombre `---` y puntuación `---`.
  - `Mejor global` y `MEJOR PUNTUACIÓN` de la tarjeta: `—`. `Partidas`: `0`.
- **Limpieza de mocks en `src/lib/data.ts`:** se eliminan `seededScores`, `PLAYERS`, `ScoreRow` y los campos `best`/`plays` de la interfaz `Game` y de las 8 entradas.
- Clase CSS mínima nueva en `globals.css` para el estado vacío (`.lb-empty`), solo si las existentes no alcanzan.

**No incluye:**

- Puntuaciones de invitados, sesiones anónimas o guardado sin cuenta.
- Anti-trampas: validar la puntuación contra la partida, firmas o rate limiting. La Server Action solo valida tipo, rango, juego conocido y sesión.
- Contar partidas jugadas sin guardar. `plays` = puntuaciones guardadas.
- Realtime (rankings en vivo) y Edge Functions: specs propios.
- Rankings por período (semanal, mensual) o globales entre juegos.
- El ranking mock `TOP_PLAYERS` del home (`src/app/page.tsx`): se queda como está.
- Editar o borrar puntuaciones desde la app, o un perfil con historial.
- Migrar `av_scores` de `localStorage`: se descarta sin migrar.
- Una tabla `games` en la BD.
- Cambios al juego ASTEROX y la limpieza de filas de `rocas`: spec 06.

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_create_scores.sql
create table public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null check (char_length(game_id) between 1 and 40),
  score integer not null check (score between 0 and 99999999),
  created_at timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);

alter table public.scores enable row level security;

create policy "Scores are viewable by everyone"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "Users insert their own scores"
  on public.scores for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Mejor marca por jugador y juego (desempate: la marca más antigua gana).
create view public.game_leaderboard
with (security_invoker = true) as
select
  best.game_id,
  best.user_id,
  best.username,
  best.score,
  best.created_at,
  row_number() over (
    partition by best.game_id
    order by best.score desc, best.created_at asc
  ) as rank
from (
  select distinct on (s.game_id, s.user_id)
    s.game_id, s.user_id, p.username, s.score, s.created_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  order by s.game_id, s.user_id, s.score desc, s.created_at asc
) best;

-- Estadísticas por juego.
create view public.game_stats
with (security_invoker = true) as
select game_id, max(score) as best, count(*) as plays
from public.scores
group by game_id;
```

```ts
// src/app/games/actions.ts
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
export async function saveScore(input: { gameId: string; score: number }): Promise<SaveScoreResult>;

// src/lib/scores.ts
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
export function getLeaderboard(gameId: string, limit: number): Promise<LeaderboardRow[]>;
export function getUserBest(gameId: string, userId: string): Promise<LeaderboardRow | null>;
export function getGameStats(): Promise<Record<string, GameStats>>;
```

```ts
// src/lib/data.ts — interfaz Game tras la limpieza
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  // best y plays se eliminan: ahora vienen de game_stats
}
```

Claves de `localStorage`: `av_scores` **se elimina** (no se lee ni se escribe).

## Plan de implementación

1. **Migración:** escribir `supabase/migrations/<timestamp>_create_scores.sql` (tabla, índice, RLS, políticas y las dos vistas). Aplicarla con el MCP (`apply_migration`) y verificarla con `list_tables` y `get_advisors` (seguridad). Regenerar `src/lib/supabase/database.types.ts` con `generate_typescript_types`. La app no cambia todavía.
2. **Lecturas:** crear `src/lib/scores.ts` con `getLeaderboard`, `getUserBest` y `getGameStats`, incluido el mapeo de `created_at` → `dd/mm/aaaa`.
3. **Server Action:** crear `src/app/games/actions.ts` con `saveScore` (sesión, validación, insert, `revalidatePath`). Consultar antes `node_modules/next/dist/docs/` sobre Server Actions y `revalidatePath` en Next 16.
4. **Contexto + modal:** cambiar `saveScore` en `session-context.tsx` para que llame a la Server Action (sin `av_scores`). Adaptar el modal de `game-player.tsx`: con sesión, username + `GUARDANDO...` + toast o error con reintento; sin sesión, `INICIA SESIÓN PARA GUARDAR TU MARCA` + botón `/login`. A partir de aquí, las partidas guardadas ya llegan a la BD.
5. **Detalle del juego:** `src/app/games/[id]/page.tsx` lee `getLeaderboard(id, 10)` y `getGameStats()`, con estado vacío.
6. **Salón de la Fama:** convertir `hall-of-fame/page.tsx` en Server Component con `searchParams.game`, pestañas como `Link`, podio, tabla top 12, `TU MEJOR MARCA` con `getUserBest` y estados vacíos.
7. **Catálogo:** `games/page.tsx` como Server Component con `getGameStats()`. Mover la búsqueda y los filtros a `src/components/games-browser.tsx`. `GameCard` recibe `best: number | null`.
8. **Limpieza:** eliminar de `data.ts` `seededScores`, `PLAYERS`, `ScoreRow`, `best` y `plays`. Corregir cualquier referencia restante que señale el compilador.
9. **Pase final:** guardar marcas con dos cuentas distintas en al menos dos juegos y verificar todas las pantallas. Revisar mobile (<840px) en el Salón de la Fama y el detalle. Correr `npm run lint` y `npm run build`.

Cada paso deja la app funcional (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [x] `supabase/migrations/` contiene la migración de `scores`, y `list_migrations` del MCP la muestra aplicada en el proyecto remoto.
- [x] `public.scores` tiene RLS activado, y `get_advisors` (seguridad) no reporta alertas sobre `scores`, `game_leaderboard` ni `game_stats`.
- [x] `src/lib/supabase/database.types.ts` incluye `scores`, `game_leaderboard` y `game_stats`.
- [x] Con sesión, al terminar una partida y pulsar `GUARDAR PUNTUACIÓN`, el botón muestra `GUARDANDO...` y queda deshabilitado. Después aparece `▸ PUNTUACIÓN GUARDADA_` y existe una fila nueva en `public.scores` con el `user_id`, el `game_id` y la `score` correctos.
- [x] Si la Server Action falla (p. ej., la sesión expiró), el modal muestra `.shake` + `.form-error` y permite reintentar.
- [x] Sin sesión, el modal no muestra input ni botón de guardar: muestra `INICIA SESIÓN PARA GUARDAR TU MARCA` y un botón que lleva a `/login`.
- [ ] Llamar a `saveScore` sin sesión, con un `gameId` inexistente o con un `score` negativo, decimal o mayor que `99 999 999` devuelve `{ ok: false }` y no inserta nada. _(Verificado solo el caso sin sesión, simulando la sesión expirada. Las validaciones de `gameId` y `score` están en el código, pero no se ejecutaron porque la interfaz no permite enviar esos valores.)_
- [x] Un insert directo vía la API de Supabase con un `user_id` ajeno es rechazado por RLS.
- [x] El detalle `/games/[id]` muestra el top 10 real (una fila por jugador con su mejor marca), y `Mejor global` y `Partidas` coinciden con `max(score)` y `count(*)` de ese juego en `scores`.
- [x] `/hall-of-fame?game={id}` muestra el podio y el top 12 reales del juego. Cambiar de pestaña cambia la URL, y recargar conserva la pestaña.
- [x] Un jugador con varias partidas en el mismo juego aparece una sola vez en cada ranking, con su mejor marca.
- [ ] Con sesión, `TU MEJOR MARCA` muestra el rango real del usuario aunque esté fuera del top 12. Si no tiene marcas en ese juego, muestra `AÚN SIN MARCA · JUEGA AHORA`. _(Verificados el rango dentro del top y `AÚN SIN MARCA`. El caso fuera del top 12 no se probó porque requiere 13 jugadores; usa la misma consulta a `game_leaderboard`.)_
- [x] Un juego sin puntuaciones muestra `SIN MARCAS AÚN · SÉ EL PRIMERO` en los leaderboards, `---` en el podio, `—` en `Mejor global` y en la tarjeta, y `0` en `Partidas`.
- [x] Las tarjetas de `/games` muestran la mejor puntuación real de cada juego, y la búsqueda y los filtros por categoría siguen funcionando igual.
- [x] Tras guardar una marca nueva, al navegar al Salón de la Fama o al detalle (sin recargar manualmente) se ve la marca actualizada.
- [x] `seededScores`, `PLAYERS`, `ScoreRow`, `best`, `plays` y `av_scores` ya no aparecen en ningún archivo de `src/`. _(`best`/`plays` ya no existen como datos mock de `Game`; solo aparecen como columnas reales de la vista `game_stats`.)_
- [x] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Se numera 05 aunque el 06 ya exista:** decisión explícita del usuario. El 06 (ASTEROX) se escribió antes, pero depende de este y se implementa después.
- **Solo se guardan puntuaciones con sesión:** decisión explícita del usuario. El invitado juega, pero ve un aviso para iniciar sesión. _Descartado:_ guardado de invitados con iniciales y `user_id` nulo (requiere inserts anónimos y es fácil de spamear).
- **Escritura vía Server Action con validación en servidor + RLS como garantía final:** decisión explícita del usuario, mismo patrón que el login del spec 04. _Descartado:_ insert directo desde el navegador.
- **Se guardan todas las partidas, pero los rankings muestran la mejor marca por jugador:** decisión explícita del usuario. Evita que un jugador llene el top. _Descartado:_ un ranking con todas las partidas.
- **Leer en Server Components con vistas SQL** (`game_leaderboard`, `game_stats`) y la pestaña del Salón en la URL (`?game=`): decisión explícita del usuario. Datos frescos sin parpadeo de carga. _Descartado:_ fetch desde el cliente.
- **Vistas con `security_invoker = true`:** respetan el RLS de `scores` y `profiles` y evitan la alerta de "security definer view" de los advisors.
- **`game_id` como `text` validado en código contra `GAMES`, sin tabla `games`:** decisión explícita del usuario. Permite renombrar o reemplazar juegos (como `rocas` → `asterox` en el spec 06) sin migraciones: las filas viejas quedan huérfanas y se borran con `delete from public.scores where game_id = '...'`. _Descartado:_ una tabla `games` con FK (el catálogo quedaría duplicado entre `data.ts` y la BD).
- **El simulador puede guardar puntuaciones:** decisión explícita del usuario. Permite probar el spec de punta a punta antes de que existan juegos reales. Al reemplazar un simulador por su juego real, su spec borra esas filas.
- **`user_id` referencia a `public.profiles(id)`** (no a `auth.users`): permite el join con `username`, y el `on delete cascade` del perfil ya cascadea desde `auth.users`.
- **Rango de `score`: entero entre 0 y 99 999 999** (8 dígitos, como un marcador arcade). Límite propuesto en el spec, ajustable al revisarlo.
- **Desempate del ranking: la marca más antigua gana** (`created_at asc`), como en los arcades.
- **Guardado con botón en el modal**, no automático: decisión explícita del usuario. Permite descartar una partida. Se quita el input de iniciales porque el nombre es el `username`.
- **`saveScore` se mantiene en el contexto de sesión, pero asíncrono y respaldado por la Server Action:** el modal y el futuro spec 06 siguen usando `useSession().saveScore`, solo que ahora devuelve `Promise<SaveScoreResult>`.
- **`plays` = número de puntuaciones guardadas:** decisión explícita del usuario. _Descartado:_ registrar cada partida jugada (requiere otra tabla o eventos).
- **`TU MEJOR MARCA` con el rango real calculado**, aunque esté fuera del top: decisión explícita del usuario.
- **Se eliminan todos los mocks (`seededScores`, `PLAYERS`, `best`, `plays`) y `av_scores` sin migrar:** decisión explícita del usuario. No hay usuarios reales. _Descartado:_ mezclar datos mock y reales.
- **Estado vacío arcade** (`SIN MARCAS AÚN · SÉ EL PRIMERO`, `---`, `—`) en lugar de ocultar secciones: decisión explícita del usuario.
- **`TOP_PLAYERS` del home queda mock:** el usuario solo pidió Salón de la Fama, detalle y tarjetas.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puntuaciones falsas: cualquiera con sesión puede llamar a la Server Action con un número inventado.                                                                                                                                                                                                              | Aceptado para el MVP. Hay validación de rango y de juego. El anti-trampas queda fuera de alcance y se documenta para un spec futuro.                                                                     |
| Las filas del simulador ensucian los rankings cuando llegue el juego real.                                                                                                                                                                                                                                       | Cada spec que reemplace un simulador incluye el borrado de las filas de su `game_id`. El spec 06 debe agregar el de `rocas`.                                                                             |
| El spec 06 dice que `best`/`plays` "siguen siendo mock hasta que el spec 05 los alimente", pero este spec los elimina de `Game`.                                                                                                                                                                                 | Al implementar el 06, su ficha `asterox` no lleva `best`/`plays` (vienen de `game_stats`), y su modal usa la firma asíncrona de `saveScore`. **Resuelto:** el spec 06 ya se actualizó con estos ajustes. |
| `distinct on` + `row_number()` en una vista recorre toda la tabla de un juego en cada lectura.                                                                                                                                                                                                                   | Aceptable con el volumen actual, apoyado en el índice `(game_id, score desc)`. Si crece, una vista materializada o una tabla `best_scores` irían en un spec propio.                                      |
| Convertir `/games` y el Salón de la Fama en Server Components puede romper la interactividad actual (filtros, pestañas).                                                                                                                                                                                         | Los filtros se mueven sin cambios a `games-browser.tsx`. Las pestañas pasan a `Link` con `searchParams`. Hay criterios de aceptación específicos.                                                        |
| Cambios de API en Next 16 (Server Actions, `revalidatePath`, `searchParams` asíncronos) frente al conocimiento previo.                                                                                                                                                                                           | El paso 3 obliga a consultar `node_modules/next/dist/docs/`.                                                                                                                                             |
| Un perfil borrado elimina sus puntuaciones (cascade).                                                                                                                                                                                                                                                            | Comportamiento deseado: sin perfil no hay nombre que mostrar.                                                                                                                                            |
| **(Detectado durante la implementación)** `get_advisors` reporta la función `public.rls_auto_enable()` (`SECURITY DEFINER`, ejecutable por `anon` y `authenticated` vía RPC) y la protección de contraseñas filtradas desactivada. Ninguno viene de este spec: la función no está en ninguna migración del repo. | Fuera de alcance. Revocar `EXECUTE` o eliminar la función en una tarea aparte, y activar "Leaked password protection" en el dashboard de Auth.                                                           |
| **(Detectado durante la implementación)** En móvil (390 px) hay scroll horizontal por el botón hamburguesa y `.av-mobile-panel` del Nav (bug ya documentado en el spec 02), y los encabezados de la tabla del Salón de la Fama se pisan.                                                                         | Fuera de alcance: el marcado de la tabla no cambió en este spec. Queda para un spec de ajustes de móvil.                                                                                                 |
| **(Detectado durante la implementación)** Las fechas de las marcas se formatean en UTC: una marca guardada de noche en UTC−5 se ve con la fecha del día siguiente.                                                                                                                                               | Aceptado. Si se quiere la hora local, basta con cambiar `timeZone` en `src/lib/scores.ts`.                                                                                                               |
