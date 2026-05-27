# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Important: Non-standard Next.js

This is **not** the Next.js version most training data covers — Next.js 16 has breaking changes. APIs, conventions, and file structure may differ. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Streaming is broken** in this version — `ReadableStream`/SSE hangs. Always use plain JSON request/response.

## Project Overview

An AI-powered code-review web tool. Users paste code, pick a language, and get a review from an LLM via OpenRouter. The UI is a client component; the review logic is a server-only API route.

### Tech Stack

- **Next.js 16.2.6 (App Router)** — server-rendered pages, API routes.
- **TypeScript (strict)** — path alias `@/*` → `./src/*`.
- **React 19.2.4** — functional components, `"use client"` where needed.
- **Tailwind CSS v4** — `@import "tailwindcss"` syntax with `@theme inline`.
- **Jest 30** — `jest.config.ts` uses `next/jest`; setup file is `jest.setup.ts` (polyfills `Request`/`Headers`/`Response`/`fetch` via `globalThis`).
- **OpenRouter API** — model configured via `OPENROUTER_MODEL` env var (default: `openrouter/owl-alpha`).
- **ESLint 9** — flat config via `eslint-config-next`.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Start dev server at `localhost:3000` |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run test` | Run all Jest tests |
| `npx jest --testPathPattern security.test` | Run security/rate-limiter tests only |
| `npx jest --testPathPattern Navbar.test` | Run Navbar component test only |
| `npm run lint` | ESLint |

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout: loads Geist fonts, wraps Navbar
│   ├── page.tsx            # Client page: code textarea, language selector, review output
│   ├── globals.css         # Tailwind v4 entry + dark mode via prefers-color-scheme
│   └── api/review/
│       ├── route.ts        # POST /api/review — validates input, calls OpenRouter JSON endpoint
│       ├── config.ts       # Runtime env validation (API key format, rate limit params, Upstash)
│       ├── middleware.ts   # Rate limiting (API-key or IP), client IP resolution, store abstraction
│       └── logger.ts       # Request-duration logging helper
├── components/
│   └── Navbar.tsx          # Top nav with avatar + brand link
└── __tests__/
    ├── Navbar.test.tsx     # Component test (mocks next/image)
    └── security.test.ts    # Security & rate-limiter unit tests (node env)
```

### Request Flow

1. `page.tsx` sends `POST /api/review` with `{ code, language }`.
2. `route.ts` validates config → checks `Content-Length` → parses JSON → applies rate limiting via `middleware.ts`.
3. `middleware.ts` resolves identity from API key (`x-api-key` header) or client IP (checks `req.ip`, `cf-connecting-ip`, `x-client-ip`, `x-real-ip`, `x-forwarded-for` in order). Rate limit store is either **in-memory** (sliding window, capped at 1000 keys) or **Upstash Redis** (sorted set with pipeline commands).
4. Code is sanitized against `[[CODE_START]]`/`[[CODE_END]]` delimiter injection, embedded into a structured prompt, and sent to OpenRouter's `/chat/completions` with a 30-second timeout.
5. Response is `{ content: string, usage?: { prompt_tokens, completion_tokens } }` — **not streamed**.

### Key Files — What to Know Before Editing

- **`config.ts`** — Validates all env vars at import time. `config.isValid` gates the API route. `OPENROUTER_API_KEY` must start with `sk-or-v1-` and be ≥32 chars. `REVIEW_API_KEYS` (comma-separated whitelist) is optional. Upstash Redis creds are optional; if one is set, both must be present.
- **`middleware.ts`** — Exports `rateLimiter(req)` returning `NextResponse | undefined` (undefined = allow). Also exports `InMemoryStore`, `UpstashRedisStore`, `getClientIp`, `isValidApiKey`, `isValidIp`, `setRateLimitHeaders`. Falls back to in-memory store on Redis errors.
- **`route.ts`** — Does NOT stream. Returns plain `NextResponse.json()`. Tracks token usage via `localStorage` on the client side (100k token limit).
- **`page.tsx`** — Client component with `MarkdownView` that renders headings, lists, bold, and paragraphs from the AI response. Token budget is tracked in `localStorage` under key `codereview_tokens_used`.

### Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | Must match `sk-or-v1-*` |
| `OPENROUTER_MODEL` | No | Default: `openrouter/owl-alpha` |
| `RATE_LIMIT_WINDOW_MS` | No | Default: 60000 |
| `RATE_LIMIT_MAX` | No | Default: 60 |
| `REVIEW_API_KEYS` | No | Comma-separated whitelist; if empty, API key auth is open |
| `UPSTASH_REDIS_REST_URL` | No | Enables Redis-backed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Required if URL is set |

`.env.local` is tracked in git — **do not commit new secrets**.
