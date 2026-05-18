# CLAUDE.md

@AGENTS.md

## Project Overview

AI-powered code review tool. Users paste code, select a language, and get a review report via the OpenRouter API (`nvidia/nemotron-3-super-120b-a12b:free` model). Review covers: Security, Code Organization, Code Aesthetics, Architecture, Logic/Correctness, AI-Generated Code Detection.

## Tech Stack

- **Next.js 16** (App Router) / **TypeScript** / **React 19**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`)
- **ESLint 9** (flat config, core-web-vitals + TypeScript)
- **OpenRouter API** for AI reviews (server-side fetch in API route)

## Key Structure

```
src/app/
  page.tsx          # Main UI — language selector, code input, review output
  layout.tsx        # Root layout with Geist fonts and Navbar
  globals.css       # Tailwind entry
  api/review/route.ts  # POST endpoint — calls OpenRouter
  components/
    Navbar.tsx      # Top navbar with avatar
```

## Environment

- `OPENROUTER_API_KEY` — required, loaded from `.env` (not committed)

## Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run start   # Run production build
npm run lint    # ESLint
```

## Conventions

- This is **not** the Next.js from training data — breaking changes exist. Check `node_modules/next/dist/docs/` before writing code.
- Keep API keys server-side only (API routes, not client components).
- Token counter is an approximation (`code.length / 4`), limit is 100k tokens.
