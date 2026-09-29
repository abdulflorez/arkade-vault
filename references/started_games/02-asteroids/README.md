# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Demo:

[Asteroids demo](https://klerith.github.io/claude-asteroids/)

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción                        |
| --------- | ------------------------------ |
| `←` `→`   | Rotar nave                     |
| `↑`       | Propulsar                      |
| `Espacio` | Disparar                       |
| `B`       | Activar Bomba Nova (si hay en inventario) |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |

## Power-ups

Al destruir un asteroide hay una probabilidad de que suelte un power-up: una figura geométrica parpadeante que se recoge tocándola con la nave.

| Figura     | Letra | Power-up          | Efecto                                                                 |
| ---------- | :---: | ------------------ | ----------------------------------------------------------------------- |
| Hexágono   | `E`   | Escudo Temporal     | Absorbe un impacto de asteroide sin perder vida. Dura hasta recibir un golpe o hasta que termine el nivel. |
| Triángulo  | `T`   | Disparo Triple      | Dispara 3 balas en abanico. Dura 10s.                                    |
| Rombo      | `R`   | Ralentí (Slow Motion) | Los asteroides se mueven a mitad de velocidad. Dura 6s.                |
| Pentágono  | `H`   | Hiperpropulsión     | Aumenta drásticamente aceleración, velocidad máxima y giro. Dura 8s.    |
| Rayo       | `L`   | Láser Sostenido     | Mientras mantengas `Espacio`, dispara un rayo continuo en vez de balas. Dura 7s. |
| Estrella   | `N`   | Bomba Nova          | Se guarda en un inventario (máx. 2). Actívala con `B` para destruir todos los asteroides en pantalla. |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- 6 power-ups recogibles con probabilidad al destruir asteroides
