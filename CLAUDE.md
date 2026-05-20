# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Non-standard Next.js

This is **not** the Next.js from training data — APIs, conventions, and file structure may differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Project Overview

AI-powered code review tool. Users paste code, select a language, and get a review report via the OpenRouter API (`nvidia/nemotron-3-super-120b-a12b:free` model). Review covers: Security, Code Organization, Code Aesthetics, Architecture, Logic/Correctness, AI-Generated Code Detection.

## Tech Stack

- **Next.js 16** (App Router) / **TypeScript** (strict mode) / **React 19**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) — inline utility classes, zinc color palette, dark mode via `prefers-color-scheme`
- **ESLint 9** (flat config, core-web-vitals + TypeScript)
- **OpenRouter API** for AI reviews (server-side fetch in API route)

## Key Structure

```
src/app/
  page.tsx              # Main UI — language selector, code input, review output
  layout.tsx            # Root layout with Geist fonts and Navbar
  globals.css           # Tailwind entry + CSS custom properties
  api/review/route.ts   # POST endpoint — calls OpenRouter, returns { report, usage }
  components/
    Navbar.tsx          # Top navbar with avatar
```

## Environment

- `OPENROUTER_API_KEY` — required, loaded from `.env.local`

## Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run start   # Run production build
npm run lint    # ESLint
```

No test framework is configured.

## Conventions

- Path alias `@/*` maps to `./src/*` (in tsconfig, use instead of deep relative imports)
- `"use client"` on interactive components; API routes are implicitly server-side
- API keys must stay server-side only (API routes, never client components)
- Token counter is approximate (`code.length / 4`), localStorage limit is 100k tokens
- No Prettier — rely on ESLint for code style
