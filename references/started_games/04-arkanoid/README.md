# Juego de Arkanoid

Un clon de Arkanoid/Breakout hecho con HTML, CSS y JavaScript puro — **cero dependencias**. No hay framework, ni bundler, ni gestor de paquetes: cualquiera puede abrir `index.html` y jugar directamente.

## Cómo jugar

Abrí `index.html` en el navegador (no hace falta servidor).

- **Mover la paleta:** flechas ← →, teclas A/D, o mouse.
- **Lanzar la bola:** Space o click.
- **Pausar/reanudar:** Esc.
- **Elegir nivel** (durante la pausa): seleccioná uno de los 10 niveles en el `<select>` que aparece sobre el canvas.
- **Reiniciar** (desde Game Over o Victoria): Enter o click.

Hay 10 niveles con figuras de bloques distintas. Rompé todos los bloques rompibles de un nivel (los bloques grises de titanio son irrompibles y no cuentan) para pasar automáticamente al siguiente, sin perder tus 3 vidas, hasta completar el nivel 10 y ganar. A partir del nivel 6 todo se ve más chico (zoom-out) para dar lugar a niveles más grandes. Saltar de nivel manualmente con el selector resetea el puntaje de la partida a 0; avanzar completando un nivel no. El high score se guarda automáticamente en el navegador.

## Estructura del proyecto

- `index.html`, `game.js`, `style.css` — el juego.
- `assets/` — assets estáticos (sprite sheet y sonidos).
- `specs/` — specs de features, siguiendo el workflow descrito en `CLAUDE.md`.

## Estado

- MVP jugable (`specs/01-mvp-jugable.md`).
- Efectos de partículas al romper bloques (`specs/02-particulas-destruccion-bloques.md`).
- Progresión de 10 niveles, bloques titanio, zoom-out y selector de nivel (`specs/03-progresion-de-niveles.md`).
