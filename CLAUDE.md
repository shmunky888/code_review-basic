# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Non-standard Next.js

This is **not** the Next.js version most training data covers — APIs, conventions, and file structure may differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Project Overview

An AI‑powered code‑review web app. Users paste code, select a language, and receive a review generated via the OpenRouter API. The UI lives in the **app** router, while the review logic runs on a server‑only API route.

## Tech Stack

- **Next.js 16 (App Router)** – server‑rendered pages, API routes, and edge‑compatible utilities.
- **TypeScript** – strict mode, `tsconfig.json` alias `@/*` → `./src/*`.
- **React 19** – functional components, client‑side interactivity.
- **Tailwind CSS v4** – utility‑first styling, dark‑mode via `prefers-color-scheme`.
- **ESLint 9** – flat config, included via `npm run lint`.
- **OpenRouter API** – server‑side call to `openrouter.ai` for AI review.

## High‑Level Architecture

```
src/
├─ app/                     # Next.js App Router entry point
│   ├─ layout.tsx           # Global layout, fonts, navbar wrapper
│   ├─ page.tsx             # Main UI – code editor, language selector, review output
│   ├─ globals.css          # Tailwind entry & custom CSS variables
│   └─ api/
│       └─ review/
│           └─ route.ts      # POST endpoint – validates input, calls OpenRouter, returns {content, usage}
│
├─ components/
│   ├─ Navbar.tsx          # Top navigation bar with user avatar
│   └─ … (UI widgets)      # Small presentational components used by page.tsx
│
└─ … (other folders as needed)
```

- **UI flow**: `page.tsx` renders a textarea for code, a language dropdown, and a button that POSTs to `/api/review`. The response JSON is displayed in the UI.
- **Server side**: `api/review/route.ts` validates the payload, sanitizes the language identifier, builds a prompt, and forwards it to OpenRouter. Errors are normalised into JSON with HTTP‑status codes.
- **Environment**: `OPENROUTER_API_KEY` is required and must stay server‑only (loaded from `.env.local`). No secrets are ever sent to the client.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Create production build
npm run start        # Run the production build locally
npm run lint         # Run ESLint linting
# No test framework is configured – add one if needed.
```

### Running a single test (if tests are added later)

If a test runner like `jest` or `vitest` is introduced, individual tests can be run with:

```bash
npm test -- <path/to/testfile>
```

## Conventions & Gotchas

- Use the `@/*` alias for imports rather than deep relative paths.
- Mark interactive components with `'use client'`; API routes are server‑only by default.
- Keep API keys in `.env.local`; **never** expose them to client code.
- Token usage is approximated (`code.length / 4`). The UI caps at 100 k tokens stored in `localStorage`.
- No Prettier – rely on ESLint's auto‑fixes for formatting.
- Streaming responses via `ReadableStream` are broken in this Next.js version; the API returns a plain JSON payload.
