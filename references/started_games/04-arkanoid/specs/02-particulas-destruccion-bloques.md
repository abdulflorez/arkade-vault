# SPEC 02 — Partículas al romper bloques

> **Status:** Implemented
> **Depends on:** SPEC 01
> **Date:** 2026-08-13
> **Objective:** Añadir un efecto de partículas (fragmentos de color con gravedad y fade-out) que acompañe a la animación de explosión existente al romper un bloque.

## Scope

**In:**

- Nuevo efecto de partículas al romper un bloque, adicional a la animación de sprite existente (`EXPLOSION_FRAMES`).
- Partículas dibujadas como pequeños rectángulos de color sólido (color del bloque roto), sin assets nuevos.
- Entre 6 y 8 partículas por bloque roto, disparadas en direcciones aleatorias, con gravedad simulada y fade-out (alpha decreciente) hasta desaparecer en 400-600ms.
- Límite de 150 partículas simultáneas en pantalla; al superarlo se descartan primero las más antiguas.
- Las partículas se congelan durante la pausa (Esc), igual que el resto del juego.
- Las partículas se limpian (`state.particles = []`) al reiniciar la partida desde Game Over/Victoria.

**Out of scope (for future specs):**

- Reemplazo de la animación de sprite `EXPLOSION_FRAMES` existente (se mantiene tal cual).
- Screen shake u otros efectos de cámara/impacto.
- Partículas con forma de fragmento real recortado del sprite del bloque.
- Partículas para otros eventos del juego (pérdida de vida, victoria, rebotes de bola).
- Cantidad de partículas variable según tamaño o tipo de bloque.

## Data model

```js
// game.js — se añade a state
const state = {
  // ...campos existentes (screen, score, highScore, lives, paddle, ball, bricks)
  particles: [
    // { x, y, dx, dy, size, color, life, maxLife }
  ],
};
```

Convenciones:

- `x`, `y`: posición actual del centro de la partícula.
- `dx`, `dy`: velocidad en píxeles/frame; `dy` se incrementa cada frame según `PARTICLE_GRAVITY` (simulación de caída).
- `size`: lado del cuadrado en píxeles, aleatorio entre 2 y 4.
- `color`: string de color CSS (no nombre de sprite), obtenido de `PARTICLE_COLORS[brick.color]`.
- `life`: tiempo restante en ms.
- `maxLife`: tiempo total de vida en ms, aleatorio entre 400 y 600; se usa para calcular `alpha = life / maxLife` al dibujar.
- `PARTICLE_MAX_COUNT = 150`: si se supera al agregar nuevas partículas, se descartan primero las del principio del array (las más antiguas).
- `PARTICLE_GRAVITY`: aceleración constante en px/frame² aplicada a `dy` en cada actualización.
- `PARTICLE_COLORS`: mapeo de los 6 nombres de color de bloque (`red`, `yellow`, `green`, `cyan`, `magenta`, `hotpink`) a sus equivalentes en color CSS sólido.

## Implementation plan

1. Definir las constantes `PARTICLE_COLORS`, `PARTICLE_MAX_COUNT`, `PARTICLE_MIN_LIFE`/`PARTICLE_MAX_LIFE`, `PARTICLE_GRAVITY`, y añadir `particles: []` a `state`. Prueba manual: recargar el juego, sin cambios visibles y sin errores en consola.
2. Implementar `spawnParticles(brick)`: genera entre 6 y 8 partículas centradas en el bloque, con velocidad inicial y tamaño aleatorios y color según `PARTICLE_COLORS[brick.color]`, agregándolas a `state.particles` (respetando `PARTICLE_MAX_COUNT`, descartando las más viejas si se excede). Llamarla desde `explodeBrick()`. Prueba manual: romper un bloque y confirmar (breakpoint o log temporal) que se añaden partículas a `state.particles`.
3. Implementar `updateParticles()`: aplica gravedad a `dy`, mueve `x`/`y`, decrementa `life`, y elimina las partículas cuyo `life` llegue a 0. Llamarla desde el loop principal únicamente cuando `state.screen === 'playing'`. Prueba manual: pausar el juego justo después de romper un bloque y confirmar que las partículas quedan congeladas en su posición hasta reanudar.
4. Implementar `drawParticles()`: dibuja cada partícula como `fillRect` con su `color` y `alpha = life / maxLife`, llamada en el loop de render después de dibujar los bloques. Prueba manual: romper varios bloques y ver las partículas cayendo y desvaneciéndose visualmente, superpuestas a la animación de explosión existente.
5. Vaciar `state.particles` en la función de reinicio existente, junto a `bricks`, `score` y `lives`. Prueba manual: jugar una partida, romper bloques, llegar a Game Over o Victoria, reiniciar, y confirmar que no quedan partículas residuales de la partida anterior.

## Acceptance criteria

- [x] Romper un bloque genera entre 6 y 8 partículas visibles del color del bloque, además de mantenerse la animación de explosión (`EXPLOSION_FRAMES`) existente.
- [x] Las partículas caen por gravedad simulada y se desvanecen (fade-out) hasta desaparecer en menos de 1 segundo.
- [x] Nunca hay más de 150 partículas simultáneas en pantalla; al romper muchos bloques seguidos, las partículas más antiguas se descartan primero.
- [x] Pausar el juego (Esc) congela las partículas en su posición actual; reanudar continúa su movimiento y desvanecimiento donde quedó.
- [x] Reiniciar la partida desde Game Over o Victoria elimina cualquier partícula restante en pantalla.
- [x] Abrir `index.html` directamente en el navegador sigue sin errores en consola.

## Decisions

- **Sí:** partículas como rectángulos de color sólido dibujados con `fillRect`, sin assets nuevos. Mantiene el principio de "zero dependencies" del proyecto y es la opción más simple y performante.
- **No:** recortar fragmentos del sprite real del bloque. Más fiel visualmente, pero mucho más complejo de implementar con el spritesheet actual y no aporta suficiente valor para el esfuerzo.
- **Sí:** las partículas conviven con la animación de sprite `EXPLOSION_FRAMES` existente, no la reemplazan. Menor riesgo: no toca código que ya funciona y que pasó por su propia spec (SPEC 01).
- **No:** screen shake u otros efectos de impacto de cámara. Se deja fuera para no ensanchar el alcance de esta spec; puede ser una spec futura de "juice"/feedback visual.
- **Sí:** 6-8 partículas por bloque con gravedad y fade en 400-600ms. Da sensación de impacto sin saturar la pantalla, considerando que el nivel tiene 78 bloques.
- **Sí:** cap de 150 partículas simultáneas, descartando las más viejas primero. Protege el rendimiento si el jugador rompe muchos bloques en poco tiempo (p. ej. la bola rebotando dentro del grid).
- **No:** límite dinámico según el hardware detectado. Overengineering para este alcance; un cap fijo es suficiente.
- **Sí:** `state.particles` vive en el estado central junto a `bricks`/`paddle`/`ball`, siguiendo el patrón ya establecido en SPEC 01.
- **Sí:** las partículas se congelan durante la pausa y se limpian al reiniciar, igual que el resto de las entidades del juego, por consistencia con el comportamiento ya definido en SPEC 01.

## What is **not** in this spec

- Reemplazo de la animación `EXPLOSION_FRAMES` existente.
- Screen shake u otros efectos de cámara.
- Partículas con forma de fragmento real recortado del sprite del bloque.
- Partículas para otros eventos del juego (pérdida de vida, victoria, rebotes de bola).
- Cantidad de partículas variable según tamaño o tipo de bloque.

Cada uno de estos, si se implementa, va en su propia spec.
