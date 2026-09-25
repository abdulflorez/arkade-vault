# 03 — About: página Acerca de + formulario de contacto con envío de correo (Resend)

- **Estado:** Implementado
- **Depende de:** SPEC 02 (home-landing)
- **Fecha:** 2026-09-16
- **Implementado:** 2026-09-24

**Objetivo:** Construir la pantalla About/Contacto (`about.jsx` en `references/templates/home-about/`) como la nueva ruta `/about`, con el enlace "Acerca de" en el `Nav`, y conectar su formulario de contacto a un envío real de correo electrónico usando Resend.

## Alcance

**Incluye:**

- Nueva pantalla About (`references/templates/home-about/about.jsx` → `src/app/about/page.tsx`):
  - Sección hero "ACERCA DE" (kicker, título, misión, `highlight-row` de 3 tarjetas con iconos SVG pixel-art inline: HEART/BROWSER/PLANT).
  - Divider decorativo animado (`.about-divider`, pixels parpadeantes).
  - Sección "CONTACTO": intro + tips, formulario (nombre, correo, mensaje) y estado de éxito (`terminal-success`), portados literalmente del template.
  - Animación "reveal on scroll" vía `IntersectionObserver` igual que en el template (clase `.reveal` → `.in`).
- Enlace "Acerca de" en `src/components/nav.tsx`, después de "Salón de la Fama" y antes del botón de sesión/login, en el menú de escritorio y el panel móvil, con estado activo en `/about` — mismo orden que `nav.jsx` del template.
- Envío real de correo del formulario de contacto vía Resend:
  - Route handler `src/app/api/contact/route.ts` (`POST`) que recibe `{ name, email, message }`, valida en servidor (campos no vacíos + formato de email válido), y llama a la API de Resend para enviar el correo.
  - Remitente: `onboarding@resend.dev` (dominio de pruebas de Resend, sin verificación de dominio propio).
  - Destinatario: dirección configurada en `CONTACT_TO_EMAIL` (variable de entorno).
  - `reply_to`: el correo ingresado por el usuario en el formulario.
  - Asunto: `Nuevo mensaje de contacto — {name}`.
  - API key de Resend leída de `RESEND_API_KEY` (variable de entorno; el valor real no se commitea).
- Estado de carga en el formulario: botón deshabilitado con texto "ENVIANDO..." mientras se espera la respuesta del route handler.
- Estado de error: si el envío falla (red, API key inválida, error de Resend), se reutiliza la animación `.shake` ya existente en el template y se muestra un mensaje de error breve en rojo debajo del formulario — no se inventa un componente visual nuevo salvo ese texto de error.
- `.env.example` documentando `RESEND_API_KEY` y `CONTACT_TO_EMAIL` (con placeholders, sin valores reales).
- Dependencia `resend` agregada a `package.json`.
- Portar a `src/app/globals.css` únicamente las clases CSS nuevas que usa About y que hoy no existen en el proyecto (extraídas de `references/templates/home-about/styles.css`): `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`/`.highlight`/`.hl-icon`/`.hl-text`, `.about-divider`/`.div-bar`/`.div-pixels`, `.about-contact`/`.contact-grid`/`.contact-intro`/`.contact-title`/`.contact-sub`/`.contact-tips`/`.tip`/`.tip-led`, `.contact-form`/`.field`/inputs/`textarea`, `.terminal-success`/`.term-bar`/`.term-body`/`.line`/`.dot`/`.caret`, `.shake` (si no existe ya) — más una clase mínima nueva para el mensaje de error (p. ej. `.form-error`), que no está en el template pero es necesaria para el estado de error acordado con el usuario.

**No incluye:**

- Persistencia de los mensajes de contacto (no se guardan en `localStorage` ni en base de datos) — solo se envían por correo y se descartan.
- Rate limiting, protección anti-spam (honeypot, captcha) o validación de email más allá del formato — fuera de alcance de este MVP.
- Dominio propio verificado en Resend — se usa el remitente de pruebas `onboarding@resend.dev`.
- Cambios al `Nav` más allá de agregar el enlace "Acerca de" — no se toca el bug preexistente del botón hamburguesa en mobile documentado en spec 02.
- Backend/autenticación real, sistema de créditos funcional — fuera de alcance igual que specs 01 y 02.
- Traducir o reescribir el contenido de `about.jsx` — se porta literalmente (mismos textos en español).

## Modelo de datos

No se introduce modelo de datos persistente. El único "dato" nuevo es la forma del payload entre el cliente y el route handler:

```ts
// src/app/api/contact/route.ts
interface ContactPayload {
  name: string;
  email: string;
  message: string;
}
```

No se persiste en `localStorage` ni en base de datos — el payload vive solo en memoria durante el request, se usa para armar el correo vía Resend, y se descarta.

**Variables de entorno** (`.env.local`, no commiteado — ya cubierto por `.gitignore`; `.env.example` documenta las claves con placeholders, sin valores reales):

```
RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

## Plan de implementación

1. Agregar la dependencia `resend` a `package.json` (`npm install resend`).
2. Portar las clases CSS listadas en Alcance desde `references/templates/home-about/styles.css` hacia `src/app/globals.css`, adaptando únicamente lo estrictamente necesario para encajar con los tokens ya definidos (sin duplicar reglas existentes).
3. Crear `src/app/api/contact/route.ts` (Route Handler, `POST`): valida que `name`, `email` y `message` no vengan vacíos y que `email` tenga formato válido; si falla, responde `400` con un mensaje de error; si pasa, llama a Resend (`from: "onboarding@resend.dev"`, `to: process.env.CONTACT_TO_EMAIL`, `reply_to: email`, `subject: "Nuevo mensaje de contacto — " + name`) y responde `200` en éxito o un error (`502` o similar) si Resend falla.
4. Crear `.env.example` con `RESEND_API_KEY=` y `CONTACT_TO_EMAIL=` (placeholders, sin valores reales).
5. Crear `src/app/about/page.tsx` con el hero, `highlight-row`, divider y sección de contacto, incluyendo el hook `useReveal` (IntersectionObserver, mismo patrón que Home en spec 02), con el formulario conectado a `fetch("/api/contact", ...)`:
   - Se mantiene la validación cliente existente (shake si hay campos vacíos), sin llamar a la API en ese caso.
   - Estado "ENVIANDO..." mientras espera la respuesta (botón deshabilitado).
   - Éxito: mismo bloque `terminal-success` del template.
   - Error: `.shake` + mensaje de error breve en rojo bajo el formulario, sin perder los datos ingresados.
6. Actualizar `src/components/nav.tsx`: agregar enlace "Acerca de" → `/about` (activo solo en `/about`), después de "Salón de la Fama" y antes del botón de sesión/login, en el nav de escritorio y en el panel móvil.
7. Pase final: revisar responsive en mobile (<840px) para la nueva pantalla, correr `npm run lint` y `npm run build`.

Cada paso deja la app funcional (`npm run dev` sirve algo coherente después de cada uno).

## Criterios de aceptación

- [x] `npm run dev` sirve `/about` con: hero (kicker, título, misión, 3 highlight cards), divider animado, y sección de contacto (intro + tips + formulario).
- [x] Las animaciones "reveal on scroll" de la sección de contacto funcionan igual que en el template.
- [x] Enviar el formulario con campos vacíos dispara el shake existente, sin llamar a la API.
- [x] Enviar el formulario completo con datos válidos: el botón muestra "ENVIANDO...", se deshabilita, y al recibir respuesta exitosa se reemplaza el formulario por el bloque `terminal-success` con el nombre del usuario.
- [x] El envío exitoso dispara un correo real vía Resend a `CONTACT_TO_EMAIL`, con `reply_to` igual al correo ingresado en el formulario.
- [x] Si el route handler responde con error (por ejemplo, quitando o invalidando `RESEND_API_KEY`), el formulario muestra el shake y un mensaje de error en rojo, sin perder los datos ingresados.
- [x] El route handler responde `400` si `name`, `email` o `message` vienen vacíos, o si `email` no tiene formato válido — sin llamar a Resend en ese caso.
- [x] El `Nav` muestra "Acerca de" en escritorio y en el panel móvil, entre "Salón de la Fama" y el botón de sesión; está activo solo en `/about`.
- [x] `.env.example` existe con `RESEND_API_KEY` y `CONTACT_TO_EMAIL` documentados (sin valores reales); `.env.local` no se commitea (ya cubierto por `.gitignore`).
- [x] `npm run lint` y `npm run build` pasan sin errores.
- [x] About está en español y usa únicamente clases porteadas desde el template, más la única clase nueva necesaria para el estado de error (no presente en el template).

## Decisiones tomadas y descartadas

- **Ruta `/about`** en inglés, siguiendo la convención de segmentos de URL en inglés ya establecida en spec 01 (`/games`, `/hall-of-fame`, `/login`) — decisión explícita del usuario. _Descartada:_ `/acerca-de`.
- **Resend con remitente de pruebas `onboarding@resend.dev`** — decisión explícita del usuario para no requerir verificación de dominio propio en este MVP. _Descartado:_ dominio propio verificado.
- **Destinatario configurable vía `CONTACT_TO_EMAIL`** en vez de hardcodearlo en el código — permite cambiarlo sin tocar código y evita commitear una dirección de correo real en el repo.
- **`RESEND_API_KEY` solo documentada, no provista en esta sesión** — decisión explícita del usuario; el valor real se agrega a `.env.local` después de la implementación, sin pegarse en el chat ni commitearse.
- **Estado de carga: botón deshabilitado con texto "ENVIANDO..."** — decisión explícita del usuario, mínima desviación visual del template para cubrir la latencia real de la API que el template (síncrono) no contemplaba.
- **Estado de error: reutilizar `.shake` + mensaje de error en rojo**, en vez de crear una variante roja del `terminal-success` — decisión explícita del usuario, prioriza no inventar componentes visuales nuevos no presentes en el template.
- **Validación también en el servidor** (campos no vacíos + formato de email), no solo confiar en el shake del cliente — decisión explícita del usuario, evita llamadas innecesarias a Resend con datos inválidos.
- **Sin persistencia de mensajes de contacto** (ni `localStorage` ni base de datos) — el mensaje solo vive en memoria durante el request y se envía por correo; consistente con el resto del proyecto (mock/sin backend real) salvo por este envío de correo real.
- **Los mensajes de contacto son independientes del sistema de sesión** (`session-context.tsx`) — no se agregan a `av_scores` ni afectan `av_user`.
- **(Detectado durante la implementación, corregido)** El `.gitignore` original (`.env*`) también ignoraba `.env.example`, impidiendo commitearlo. Se agregó la excepción `!.env.example` — decisión explícita del usuario tras señalarlo.

## Riesgos identificados

- El remitente de pruebas `onboarding@resend.dev` de Resend puede tener límites de entrega o quedar marcado como spam en algunos proveedores de correo — aceptable para MVP; migrar a un dominio propio verificado queda para un spec futuro si se vuelve necesario.
- Si `RESEND_API_KEY` no está configurada en `.env.local`, todo envío fallará y siempre se mostrará el estado de error — comportamiento esperado y documentado, no es un bug.
- El bug preexistente del botón hamburguesa en mobile (documentado en spec 02, riesgo final) no se corrige aquí — el enlace "Acerca de" se agrega al panel existente sin tocar su layout.
- **(Detectado durante la implementación)** El modo sandbox de Resend (`onboarding@resend.dev`) solo permite enviar a la dirección exacta verificada en la cuenta — un alias `+` de Gmail (ej. `nombre+algo@gmail.com`) es rechazado con `403 validation_error`, aunque Gmail lo trate como la misma bandeja. `CONTACT_TO_EMAIL` en `.env.local` debe ser la dirección exacta de la cuenta de Resend mientras no se verifique un dominio propio.
