import { NextRequest, NextResponse } from 'next/server';

// Simple in‑memory rate limiter keyed by API key (or IP fallback).
// Limits to RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS (default 60 per minute).
// Configuration is read from environment variables.

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10);
export const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX ?? '60', 10);
// Comma‑separated list of valid API keys; if empty, all keys are allowed (dev mode).
const VALID_KEYS = process.env.REVIEW_API_KEYS?.split(',').map((k) => k.trim()) ?? [];

// Store timestamps (ms) for each key, capped to limit memory footprint.
const requestMap = new Map<string, number[]>();
const MAX_KEYS = 1000; // Cap map keys to avoid memory exhaustion (OOM mitigation)

/**
 * Returns a NextResponse with 429 if limit exceeded, otherwise undefined.
 */
export const setRateLimitHeaders = (res: NextResponse, remaining: number) => {
  res.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
  res.headers.set('X-RateLimit-Remaining', String(remaining));
  return res;
};

export default async function rateLimiter(req: NextRequest): Promise<NextResponse | undefined> {
  // Helper to attach rate‑limit headers
  const setRateLimitHeaders = (res: NextResponse, remaining: number) => {
    res.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS));
    res.headers.set('X-RateLimit-Remaining', String(remaining));
    return res;
  };

  try {
    const apiKey = req.headers.get('x-api-key')?.trim();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip')?.trim();
    const clientKey = apiKey || clientIp || 'anonymous';

    // If a whitelist of keys is defined, reject unknown keys.
    if (VALID_KEYS.length && apiKey && !VALID_KEYS.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const now = Date.now();
    const timestamps = requestMap.get(clientKey) ?? [];
    
    // Keep only timestamps within the window
    const recent = timestamps.filter((t) => now - t < WINDOW_MS);
    recent.push(now);

    // Bounded Map implementation (LRU-style eviction)
    if (!requestMap.has(clientKey) && requestMap.size >= MAX_KEYS) {
      // Evict the oldest key based on Map insertion order
      const oldestKey = requestMap.keys().next().value;
      if (oldestKey !== undefined) {
        requestMap.delete(oldestKey);
      }
    }

    // Refresh insertion order / update timestamps
    requestMap.delete(clientKey);
    requestMap.set(clientKey, recent);

    if (recent.length > MAX_REQUESTS) {
      return setRateLimitHeaders(NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }), 0);
    }

    return undefined;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Rate Limiter Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
