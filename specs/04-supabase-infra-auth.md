# 04 — Supabase: infraestructura + autenticación con email y contraseña

- **Estado:** Implementado
- **Depende de:** SPEC 01 (mvp-visual-screens), SPEC 02 (home-landing)
- **Fecha:** 2026-11-05

**Objetivo:** Conectar la app de Next.js a Supabase (clientes browser/server, proxy de sesión, migraciones versionadas y tipos generados) y reemplazar el login mock de `localStorage` por Supabase Auth con email + contraseña y un `username` en la tabla `public.profiles`.

## Por qué existe este spec

Hoy la "sesión" es un objeto `{ name }` en `localStorage` (`av_user`) que cualquiera puede inventar. Antes de guardar puntuaciones reales (spec 05) necesitamos identidad real y la base de conexión a Supabase. "Implementar Supabase" se dividió a propósito: este spec cubre infraestructura + auth. Las puntuaciones en BD van en el spec 05. Realtime y Edge Functions van en specs futuros.

## Alcance

**Incluye:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr` en `package.json`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example` (placeholders). Los valores reales van solo en `.env.local`, que no se commitea.
- Clientes de Supabase:
  - `src/lib/supabase/client.ts`: `createBrowserClient` tipado con `Database`.
  - `src/lib/supabase/server.ts`: `createServerClient` con `cookies()` de `next/headers`, para Server Components y Server Actions.
  - `src/lib/supabase/proxy.ts`: helper `updateSession(request)` que refresca la sesión y reescribe las cookies.
- `src/proxy.ts` (convención de Next 16, reemplaza a `middleware.ts`): llama a `updateSession` en todas las rutas salvo assets estáticos. Si hay sesión y la ruta es `/login`, redirige a `/`.
- Migración `supabase/migrations/<timestamp>_create_profiles.sql`, aplicada con el MCP de Supabase y guardada en el repo:
  - Tabla `public.profiles` (ver Modelo de datos).
  - Índice único sobre `lower(username)`.
  - RLS activado: `select` permitido a `anon` y `authenticated`; sin políticas de `insert`/`update`/`delete` para clientes.
  - Función `public.handle_new_user()` (`security definer`) + trigger `on_auth_user_created` en `auth.users` que crea el perfil con `raw_user_meta_data->>'username'`.
- Tipos generados con el MCP en `src/lib/supabase/database.types.ts`.
- Server Actions en `src/app/login/actions.ts`:
  - `signIn(prevState, formData)`: `signInWithPassword({ email, password })`. Si sale bien, `redirect("/")`.
  - `signUp(prevState, formData)`: valida username, email y contraseña en el servidor. Comprueba que el username no esté tomado (sin distinguir mayúsculas). Llama a `signUp({ email, password, options: { data: { username } } })`. Si sale bien, `redirect("/")`.
  - `signOut()`: `supabase.auth.signOut()` + `redirect("/")`.
- Pantalla `src/app/login/page.tsx` adaptada sin cambios visuales:
  - Pestaña "INICIAR SESIÓN": campos **Correo electrónico** + Contraseña. El campo "Usuario" se reemplaza por el correo en esta pestaña.
  - Pestaña "CREAR CUENTA": Usuario + Correo electrónico + Contraseña (como hoy).
  - Formularios conectados a las Server Actions con `useActionState`. Mientras esperan, el botón queda deshabilitado con el texto "CONECTANDO...".
  - Error: se reutiliza `.shake` + `.form-error` (spec 03) con un mensaje breve en español. Los valores ingresados se conservan, salvo la contraseña.
  - "JUGAR COMO INVITADO" sigue funcionando sin cuenta: navega a `/` sin crear sesión.
  - Los botones GOOGLE/GITHUB quedan decorativos, sin cambios.
- `src/lib/session-context.tsx` refactorizado:
  - `user` deja de leerse de `localStorage` (`av_user` se elimina). Pasa a llegar como prop inicial desde `src/app/layout.tsx`, que en el servidor lee `auth.getUser()` + `profiles.username`.
  - Se mantiene la forma pública `user: { name: string } | null`, con `name = profiles.username`, para no tocar a los consumidores (`nav.tsx`, `hall-of-fame/page.tsx`, `game-player.tsx`).
  - `signOut` invoca la Server Action `signOut`. La función `login` se elimina del contexto.
  - `saveScore` queda **igual** (sigue guardando en `localStorage` `av_scores`), usando el username real como `name`.
- `src/components/nav.tsx`: "Cerrar sesión" usa el nuevo `signOut`. Muestra el `username` tal como fue registrado (sin forzar mayúsculas).
- Paso manual documentado: desactivar **Confirm email** en el dashboard de Supabase (Authentication → Providers → Email).

**No incluye (para specs futuros):**

- Tabla de puntuaciones en BD, Salón de la Fama y detalle de juego con datos reales, y migrar `av_scores`: **spec 05**.
- Realtime (rankings en vivo) y Edge Functions.
- OAuth (Google/GitHub). Los botones siguen decorativos.
- Sesiones anónimas de Supabase para invitados.
- Confirmación de email, recuperación de contraseña ("olvidé mi contraseña"), cambio de email o contraseña.
- Editar el `username` o una pantalla de perfil.
- Rutas protegidas: ninguna ruta requiere sesión.
- Login con username (solo con email).
- Supabase CLI y stack local con Docker.
- El bug preexistente del botón hamburguesa en mobile (spec 02).

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_create_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));
```

```ts
// Forma pública del contexto (sin cambios para los consumidores)
export interface Session {
  name: string; // = profiles.username
}
```

Reglas del `username`:

- Entre 3 y 20 caracteres después de `trim()`.
- Se guarda tal como lo escribe el usuario: sin forzar mayúsculas y sin restringir caracteres ni símbolos.
- Único sin distinguir mayúsculas (`PX_Kai` y `px_kai` chocan).

Contraseña: mínimo 6 caracteres (el mínimo por defecto de Supabase Auth).

Variables de entorno (`.env.local`, no commiteado; `.env.example` con placeholders):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Claves de `localStorage`: `av_user` **se elimina**. `av_scores` se mantiene sin cambios hasta el spec 05.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example`. Cargar los valores reales en `.env.local`, obtenidos con el MCP (`get_project_url`, `get_publishable_keys`).
2. Escribir `supabase/migrations/<timestamp>_create_profiles.sql` (tabla, índice, RLS, función y trigger), aplicarla con el MCP (`apply_migration`) y verificarla con `list_tables` y `get_advisors` (seguridad).
3. Generar `src/lib/supabase/database.types.ts` con el MCP (`generate_typescript_types`).
4. Crear `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` y `src/lib/supabase/proxy.ts` tipados con `Database`. Consultar antes `node_modules/next/dist/docs/` para `cookies()` y la API de proxy de Next 16.
5. Crear `src/proxy.ts`: llama a `updateSession` con un matcher que excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes. Si hay usuario y la ruta es `/login`, redirige a `/`. La app sigue funcionando igual porque aún nadie inicia sesión.
6. Crear `src/app/login/actions.ts` con `signIn`, `signUp` y `signOut`, incluyendo la validación en servidor y los mensajes de error en español (credenciales inválidas, username tomado, email ya registrado, campos inválidos).
7. Refactorizar `src/lib/session-context.tsx` (usuario como prop inicial, `signOut` vía Server Action, sin `av_user`, `saveScore` intacto). Actualizar `src/app/layout.tsx` para leer usuario + perfil en el servidor y pasarlos al `SessionProvider`. Ajustar `src/components/nav.tsx`.
8. Adaptar `src/app/login/page.tsx`: email en "INICIAR SESIÓN", `useActionState`, estado "CONECTANDO...", error con `.shake` + `.form-error`, invitado sin sesión.
9. Desactivar "Confirm email" en el dashboard de Supabase (paso manual del usuario).
10. Pase final: `npm run lint` y `npm run build`, y revisión en mobile (<840px) de la pantalla de login.

Cada paso deja la app funcional (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [x] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [x] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales, y `.env.local` no se commitea.
- [x] `supabase/migrations/` contiene la migración de `profiles`, y `list_migrations` del MCP la muestra aplicada en el proyecto remoto.
- [x] `public.profiles` tiene RLS activado, y `get_advisors` (seguridad) no reporta alertas sobre `profiles` ni sobre `handle_new_user`.
- [x] `src/lib/supabase/database.types.ts` existe e incluye la tabla `profiles`.
- [x] Registrarse con usuario + email + contraseña válidos crea la fila en `auth.users` y en `public.profiles` con ese `username`, inicia sesión y redirige a `/`.
- [x] Tras registrarse o iniciar sesión, el `Nav` muestra el `username` tal como se registró (mayúsculas y minúsculas conservadas).
- [x] Registrarse con un username ya existente, aunque cambie mayúsculas/minúsculas, muestra el error "ese usuario ya existe" con `.shake` y no crea cuenta.
- [x] Registrarse con un username de menos de 3 o más de 20 caracteres, o con una contraseña de menos de 6, muestra un error y no llama a `signUp`.
- [x] Iniciar sesión con email + contraseña correctos redirige a `/` con la sesión activa. Con credenciales incorrectas muestra el error con `.shake` + `.form-error` y conserva el email ingresado.
- [x] Mientras la Server Action está en curso, el botón está deshabilitado y muestra "CONECTANDO...".
- [x] Recargar la página (F5) mantiene la sesión: el `Nav` sigue mostrando el `username`.
- [x] "Cerrar sesión" en el `Nav` termina la sesión en Supabase y redirige a `/`. Al recargar, el usuario sigue deslogueado.
- [x] Con sesión activa, visitar `/login` redirige a `/`.
- [x] "JUGAR COMO INVITADO" navega a `/` sin crear sesión, y los juegos siguen siendo jugables sin cuenta.
- [ ] Al terminar una partida con sesión activa, `saveScore` guarda en `localStorage` `av_scores` con `name` igual al `username`.
- [x] La clave `av_user` ya no se lee ni se escribe en ningún archivo de `src/`.
- [x] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones tomadas y descartadas

- **Dividir "implementar Supabase" en spec 04 (infra + auth) y spec 05 (puntuaciones)**: decisión explícita del usuario. _Descartado:_ un solo spec con todo, o tres specs separados (infra / auth / puntuaciones).
- **Realtime y Edge Functions**: el usuario los quiere a futuro, pero quedan fuera de este spec y del 05. Cada uno tendrá su propio spec.
- **Email + contraseña**: decisión explícita del usuario, encaja con el formulario actual. _Descartados:_ magic link y OAuth.
- **Login con email; `username` en `public.profiles`**, creado por trigger al registrarse: decisión explícita del usuario. Da unicidad y una tabla consultable para los rankings del spec 05. _Descartados:_ login con username (exige resolver el email en el servidor) y username solo en `user_metadata` (sin unicidad).
- **Reglas del username: 3–20 caracteres, sin forzar mayúsculas ni restringir símbolos, único sin distinguir mayúsculas**: mezcla pedida por el usuario entre "3–10 en mayúsculas A-Z 0-9 _" y "libre hasta 20". La unicidad sin distinguir mayúsculas evita suplantaciones visuales (`PX_Kai` y `px_kai`).
- **Confirmación de email desactivada**: decisión explícita del usuario. El registro inicia sesión de inmediato y se evitan los límites del SMTP por defecto de Supabase. _Descartado:_ ruta `/auth/confirm` y pantalla "revisa tu correo".
- **Invitado sin cuenta; GOOGLE/GITHUB decorativos**: decisión explícita del usuario. _Descartados:_ `signInAnonymously` y quitar esos botones.
- **Server Actions para signIn, signUp y signOut**: decisión explícita del usuario, patrón oficial de `@supabase/ssr` con la sesión en cookies. _Descartado:_ auth desde el cliente browser.
- **`src/proxy.ts` en lugar de `middleware.ts`**: convención de Next 16 (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- **Ninguna ruta protegida; `/login` redirige a `/` si ya hay sesión**: decisión explícita del usuario, mantiene el juego abierto a invitados.
- **`saveScore` sigue en `localStorage` hasta el spec 05**: decisión explícita del usuario. Solo cambia el origen del `name`.
- **Migraciones aplicadas con el MCP y guardadas en `supabase/migrations/`**: decisión explícita del usuario, deja el esquema versionado en git. _Descartados:_ solo MCP sin archivos, y el Supabase CLI con stack local.
- **Tipos generados en `src/lib/supabase/database.types.ts`**: decisión explícita del usuario. Se regeneran después de cada migración.
- **Se mantiene la forma `user: { name }` del contexto**: así `nav.tsx`, `hall-of-fame/page.tsx` y `game-player.tsx` no necesitan cambios en este spec.
- **Usuario inicial leído en el servidor (`layout.tsx`) y pasado al provider**: evita el parpadeo "sin sesión → con sesión" que ocurriría si solo se leyera desde el cliente.
- **Validar la disponibilidad del username antes de `signUp`, con el índice único como garantía final**: si la carrera falla en el trigger, el error genérico de Supabase se traduce igualmente a "ese usuario ya existe".

## Riesgos identificados

| Riesgo                                                                                                                                                         | Mitigación                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos registros simultáneos con el mismo username pasan la verificación previa y el trigger falla, dejando un error genérico ("Database error saving new user"). | El índice único impide el duplicado. La Server Action traduce ese error a "ese usuario ya existe". Como el trigger corre en la misma transacción, `auth.users` no queda con una fila huérfana. |
| Olvidar desactivar "Confirm email": el registro no inicia sesión y el usuario queda sin feedback.                                                              | Paso 9 explícito del plan. Un criterio de aceptación verifica que el registro inicia sesión y redirige a `/`.                                                                                  |
| `handle_new_user` como `security definer` puede ser marcada por los advisors (search_path mutable).                                                            | Definirla con `set search_path = ''` y nombres totalmente calificados. `get_advisors` está en los criterios de aceptación.                                                                     |
| Usuarios con `av_user` antiguo en `localStorage` quedan "deslogueados" al desplegar.                                                                           | Aceptable: el proyecto no tiene usuarios reales. La clave simplemente deja de leerse.                                                                                                          |
| Cambios de API en Next 16 (`proxy`, `cookies()` async) frente a los ejemplos de Supabase escritos para versiones anteriores.                                   | El paso 4 obliga a consultar `node_modules/next/dist/docs/` antes de escribir los clientes.                                                                                                    |
| El SMTP por defecto de Supabase tiene límites estrictos de envío.                                                                                              | Con la confirmación desactivada y sin recuperación de contraseña, este spec no envía correos de auth.                                                                                          |

## Lo que **no** está en este spec

- Puntuaciones en base de datos y rankings reales (spec 05).
- Realtime y Edge Functions.
- OAuth Google/GitHub, sesiones anónimas y magic link.
- Confirmación de email, recuperación o cambio de contraseña, edición de perfil.
- Rutas protegidas.

Cada uno de esos, si llega, va en su propio spec.
