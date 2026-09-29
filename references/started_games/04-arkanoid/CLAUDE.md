# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

An Arkanoid/Breakout clone built with plain HTML, CSS, and JavaScript — **zero dependencies**. No framework, no bundler, no package manager. Anyone should be able to open the game and play it directly.

**Current state:** MVP, block-break particle effects, and 10-level progression are implemented (see `specs/`). `index.html`, `game.js`, and `style.css` live at the project root; `assets/` holds only static assets (sprite sheet, sounds).

Since there's no build system, there are no lint/test/build commands to run. Verify changes by opening `index.html` directly in a browser (no dev server required unless one gets introduced later).

## Workflow: spec-driven development

This repo uses two custom skills (from `Klerith/fernando-skills`, pinned in `skills-lock.json`) that structure all feature work:

- **`/spec`** — interactively designs a spec through clarifying questions, then writes it to `specs/NN-slug.md` in `Draft` state. Never write code during this flow.
- **`/spec-impl NN-slug`** — implements a spec, but only once its state is manually changed to `Approved`. It creates a branch `spec-NN-slug`, then implements the plan one step at a time, pausing for review after each step. Never commits automatically.

Practical implications for any coding session in this repo:

- If `specs/` doesn't have an approved spec covering the requested change, prefer routing through `/spec` first rather than improvising an implementation from scratch.
- Don't jump ahead of the spec's implementation plan or commit on the user's behalf — both skills are explicit that stepwise confirmation and commits are the user's call.
- `specs/.spec-config.yml` (created by `/spec` on first use) controls whether `/spec-impl` auto-creates its branch (`AutoCreateBranch: true` by default).

## Project layout

- `index.html`, `game.js`, `style.css` — the game itself, at the project root.
  - `index.html` wraps `<canvas id="game">` in a `.game-wrap` div alongside `<select id="levelSelect">`, an HTML level picker overlaid on the canvas (visible only while paused).
  - `game.js` defines `LEVELS` (10 hand-designed brick layouts, built via small shape-generator functions) and `loadLevel(n)`, which rebuilds `state.bricks`/`state.paddle`/`state.ball` for level `n`, applying `ZOOM_SCALE` (70%) from `ZOOM_START_LEVEL` (6) onward. Bricks with `breakable: false` are titanium (`TITANIUM_SPRITE`): unbreakable, worth no points, and ignored by the level-clear check.
- `assets/` — static assets only:
  - `assets/spritesheet-breakout.png` — the sprite sheet image.
  - `assets/spritesheet.js` — sprite-drawing helper, loaded by `index.html` before `game.js`:
    - `loadSpritesheet(cb)` — loads the PNG onto an offscreen canvas and invokes `cb` once ready (safe to call multiple times; queues callbacks until loaded).
    - `drawSprite(ctx, name, x, y, w, h)` — draws a sprite by name onto a canvas context. Names are looked up in `SPRITES` (`paddle`, `ball`) or, for blocks, prefixed with `block_` (e.g. `block_red`, `block_cyan`) which map into `SPRITES.blocks`.
    - `drawFrame(ctx, frame, x, y, w, h)` — draws a raw `{sx, sy, sw, sh}` frame directly, used for animations like `EXPLOSION_FRAMES` (per-color 4-frame explosion animations, `EXPLOSION_DURATION = 150`ms).
    - `loadSpritesheet` hardcodes the image path as `'assets/spritesheet-breakout.png'`, resolved relative to `index.html` at the project root.
  - `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` — sound effects for paddle/wall bounces and block breaks.
