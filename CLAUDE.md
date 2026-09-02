# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform for playing games online and competing for the highest score (see README.md, in Spanish). The codebase is currently the unmodified `create-next-app` scaffold (App Router); no game/vault features exist yet.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

No test runner is configured yet.

## Stack & structure

- Next.js 16.3.1 (App Router) — see the "NOT the Next.js you know" note above: check `node_modules/next/dist/docs/` before relying on training-data knowledge of Next.js APIs.
- React 19.2.8, TypeScript (strict mode), Tailwind CSS v4 via `@tailwindcss/postcss` — there is no `tailwind.config.*`; theme tokens (`--color-background`, `--font-sans`, etc.) are defined directly in `app/globals.css` with `@theme inline`.
- `app/` is the App Router root (`layout.tsx`, `page.tsx`, `globals.css`); the path alias `@/*` resolves to the repo root (`tsconfig.json`).
- ESLint uses flat config, extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

## Workflow

README.md states the project intends to follow Spec Driven Design via `/spec` and `/spec-impl` commands from the `Klerith/fernando-skills` pack, installed with `npx skills@latest add Klerith/fernando-skills`. These skills are not currently installed in this environment (no `.claude/skills` present) — verify availability before assuming `/spec` or `/spec-impl` can be used.

## skills

- Use always /frontend-design skill for design user interfaces.
