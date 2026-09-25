# 02 — Home: landing page de marketing

- **Estado:** Implementado
- **Depende de:** SPEC 01 (mvp-visual-screens)
- **Fecha:** 2026-09-02
- **Implementado:** 2026-09-02

**Objetivo:** Construir la landing page de marketing (`home.jsx` en `references/templates/home-about/`) como la nueva ruta `/`, moviendo la Biblioteca actual a `/games` y actualizando el `Nav` y los enlaces internos que hoy asumen que `/` es la biblioteca.

## Alcance

**Incluye:**

- Nueva pantalla Home (`references/templates/home-about/home.jsx` → `src/app/page.tsx`), con todas sus secciones:
  - Hero con siluetas flotantes decorativas (SVG pixel-art), eyebrow parpadeante, título en 3 líneas, subtítulo, CTAs ("EXPLORAR JUEGOS", "CREAR CUENTA") e indicador de scroll.
  - Sección "¿Por qué Arcade Vault?" — grid de 4 `feature-card` con iconos SVG pixel-art inline.
  - Sección "Juegos disponibles ahora" — rail de `MiniCard` con los primeros 6 juegos de `GAMES` (`lib/data.ts`), cada una navegando a `/games/[id]`; botón "VER TODOS LOS JUEGOS →" hacia `/games`.
  - Sección de stats (3 bloques: juegos, partidas, ranking).
  - Sección "Actividad en vivo" — ticker de últimas puntuaciones y top 5 jugadores (datos mock hardcodeados, portados literalmente del template), con enlace "VER SALÓN →" hacia `/hall-of-fame`.
  - Sección de precios — card de plan único gratuito con CTA "EMPEZAR GRATIS →" hacia `/login`, y FAQ de 3 preguntas.
  - CTA final ("¿LISTO PARA JUGAR?") hacia `/games`.
  - Animaciones "reveal on scroll" vía `IntersectionObserver` (clase `.reveal` → `.in`), igual que en el template.
- Mover la Biblioteca actual (contenido hoy en `src/app/page.tsx`) a `src/app/games/page.tsx`, sin cambios de comportamiento (buscador, chips de categoría, grid, estado "NO HAY RESULTADOS").
- Actualizar `src/components/nav.tsx`:
  - Agregar enlace "Inicio" → `/` (activo solo en `/` exacto), en el menú de escritorio y en el panel móvil.
  - Enlace "Biblioteca" pasa a apuntar a `/games`; su estado activo cubre `/games`, `/games/[id]` y `/games/[id]/play`.
  - El logo sigue enlazando a `/` (ahora Home, antes Biblioteca).
- Actualizar los enlaces "volver" que hoy apuntan a `/` asumiendo que es la biblioteca, para que apunten a `/games`:
  - `src/app/games/[id]/page.tsx` — botón "VOLVER AL VAULT".
  - `src/app/hall-of-fame/page.tsx` — botón "VOLVER A LA BIBLIOTECA".
  - `src/components/game-player.tsx` — botón "VOLVER AL VAULT".
- Portar a `src/app/globals.css` únicamente las clases CSS nuevas que usa Home y que hoy no existen en el proyecto (extraídas de `references/templates/home-about/styles.css`): `.home-hero`, `.home-silos`/`.silo`, `.hero-eyebrow`, `.home-title`/`.line-1/2/3`, `.home-sub`, `.home-ctas`, `.hero-scroll`, `.home-section`, `.section-head`, `.kicker`, `.section-title`, `.section-rule`, `.feature-grid`/`.feature-card`/`.ft-icon`/`.ft-title`/`.ft-desc`, `.mini-rail`/`.mini-card`/`.mini-cover`/`.mini-meta`/`.mini-title`/`.mini-cat`, `.home-stats`/`.stats-inner`/`.stat-block`/`.stat-n`/`.stat-u`/`.stat-s`, `.activity-grid`/`.activity-card`/`.ac-head`/`.ac-title`/`.ticker`/`.tick-row`/`.tk-p`/`.tk-mid`/`.tk-s`/`.tk-t`/`.lb-link`/`.top-list`/`.top-row`/`.tp-rk`/`.tp-bar`/`.tp-fill`/`.tp-p`/`.tp-s`, `.pricing-grid`/`.price-card`/`.pc-*`, `.pricing-faq`/`.faq-item`/`.faq-q`/`.faq-a`, `.home-final`/`.final-title`/`.final-cta`/`.final-tag`, `.reveal`/`.reveal.in`. Los tokens de color, tipografía y utilidades ya existentes (`--cyan`, `--magenta`, `.btn`, `.pixel`, etc.) se reutilizan tal cual.

**No incluye:**

- La pantalla About/Contacto (`about.jsx`) ni el enlace "Acerca de" en el `Nav` — queda para un spec futuro (decisión explícita del usuario).
- Cambios al formulario de login/registro más allá de que sus enlaces internos sigan apuntando a `/` (sin cambios de comportamiento).
- Backend, analytics reales o conexión de los datos de "Actividad en vivo" a puntuaciones reales — se portan como mock estático, igual que en el template.
- Sistema de créditos funcional, autenticación real, multijugador — fuera de alcance igual que en spec 01.
- Cualquier rediseño de la Biblioteca, Detalle, Reproductor, Salón de la Fama o Login más allá de actualizar los enlaces "volver" y el target del enlace "Biblioteca" en el Nav.

## Modelo de datos

No se introduce modelo de datos nuevo. Home reutiliza `GAMES` de `src/lib/data.ts` (ya existente, spec 01) para el rail de juegos. El ticker de "Actividad en vivo" (últimas puntuaciones y top jugadores) usa arrays mock hardcodeados dentro del propio componente Home, portados literalmente de `home.jsx` — no se persisten ni se leen de `localStorage`.

## Plan de implementación

1. Crear `src/app/games/page.tsx` con el contenido actual de `src/app/page.tsx` (Biblioteca), sin cambios funcionales.
2. Actualizar `src/components/nav.tsx`: agregar enlace "Inicio" (`/`, activo solo en exacto `/`), y redirigir el enlace/estado activo de "Biblioteca" a `/games` (cubriendo `/games`, `/games/[id]`, `/games/[id]/play`) — en el nav de escritorio y en el panel móvil.
3. Actualizar los tres enlaces "volver" (`src/app/games/[id]/page.tsx`, `src/app/hall-of-fame/page.tsx`, `src/components/game-player.tsx`) de `/` a `/games`.
4. Portar las clases CSS nuevas listadas en Alcance desde `references/templates/home-about/styles.css` hacia `src/app/globals.css`, adaptando únicamente lo estrictamente necesario para encajar con los tokens ya definidos (sin duplicar reglas existentes).
5. Reemplazar `src/app/page.tsx` con la pantalla Home completa (hero + siluetas, features, rail de juegos, stats, actividad en vivo, precios/FAQ, CTA final), con sus subcomponentes (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) y el hook `useReveal` (IntersectionObserver) definidos en el mismo archivo, siguiendo el patrón de `home.jsx`.
6. Pase final: revisar responsive en mobile (<840px) para las secciones nuevas, correr `npm run lint` y `npm run build`.

Cada paso deja la app funcional (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [x] `npm run dev` sirve `/` con la Home completa: hero con siluetas y CTAs, sección de features, rail de juegos, stats, actividad en vivo, precios/FAQ y CTA final.
- [x] `/games` sirve exactamente la Biblioteca (buscador, chips, grid, estado "NO HAY RESULTADOS"), igual que antes cuando vivía en `/`.
- [x] Las animaciones "reveal on scroll" de Home funcionan (las secciones aparecen al hacer scroll hasta ellas).
- [x] En Home: "EXPLORAR JUEGOS" y "VER TODOS LOS JUEGOS →" y el CTA final navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/login`; cada `MiniCard` navega a `/games/[id]`; "VER SALÓN →" navega a `/hall-of-fame`.
- [x] El `Nav` muestra "Inicio" y "Biblioteca" como enlaces separados; "Inicio" está activo solo en `/`; "Biblioteca" está activo en `/games`, `/games/[id]` y `/games/[id]/play`; el logo enlaza a `/`.
- [x] Los botones "VOLVER AL VAULT" (detalle de juego y reproductor) y "VOLVER A LA BIBLIOTECA" (salón de la fama) navegan a `/games`.
- [x] El login (iniciar sesión, crear cuenta, invitado) sigue redirigiendo a `/` (ahora Home) sin cambios de código.
- [x] El menú móvil (<840px) incluye "Inicio" y funciona igual que los demás enlaces.
- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] Home está en español y usa únicamente clases porteadas desde el template (sin diseño nuevo no presente en `home.jsx`/`styles.css`).

## Decisiones tomadas y descartadas

- **`/` pasa a ser Home; la Biblioteca se muda a `/games`.** Decisión explícita del usuario — coincide con el patrón del template (enlaces "Inicio" y "Biblioteca" separados en el Nav) y es el patrón típico de landing de marketing + app. _Descartada:_ dejar Home en `/home` y la Biblioteca en `/`.
- **Alcance limitado a Home**; About/Contacto (`about.jsx`) y el enlace "Acerca de" quedan fuera — decisión explícita del usuario, se abordarán en un spec futuro.
- **El login sigue redirigiendo a `/`** (ahora Home) tras autenticar, sin cambios de código — decisión explícita del usuario, prioriza no tocar el flujo de login en este spec.
- **Datos de "Actividad en vivo" como mock hardcodeado** dentro del componente Home, portados literalmente del template, consistente con la decisión de spec 01 de portar datos mock 1:1 sin backend.
- **Subcomponentes de Home (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) y el hook `useReveal` viven dentro de `src/app/page.tsx`**, no como archivos separados en `components/` — solo los usa Home, siguiendo el mismo patrón de archivo único que ya tiene `home.jsx` en el template y `src/app/page.tsx` (biblioteca) en el proyecto actual.
- **Solo se portan a `globals.css` las clases que Home usa y que aún no existen** — no se copia `styles.css` completo, para no duplicar tokens/utilidades ya definidos en spec 01.

## Riesgos identificados

- Mover la Biblioteca de `/` a `/games` es un cambio de ruteo que rompe cualquier enlace externo o marcador que apuntara a `/` esperando el grid de juegos. Aceptable: el proyecto no tiene usuarios reales todavía (MVP visual).
- El ticker de "Actividad en vivo" con datos hardcodeados puede leerse como real en producción; queda documentado como mock visual, igual que las puntuaciones sembradas (`seededScores`) de spec 01.
- **(Detectado durante la implementación, no corregido — fuera de alcance)** En mobile (≤~390px) el botón hamburguesa del `Nav` se desborda unos ~27px fuera del viewport (queda parcialmente cortado, aunque sigue siendo clickeable y el panel abre correctamente). Es un bug preexistente del `Nav` compartido, anterior a este spec — no se tocó su layout/CSS aquí (solo el enlace "Inicio" y el target de "Biblioteca"), y corregirlo sería un rediseño de layout que este spec excluye explícitamente. Queda anotado para un spec futuro.
