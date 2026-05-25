import { NextRequest, NextResponse } from 'next/server';

/**
 * Logs the request duration and returns the original response with a `X-Request-Duration` header.
 */
export function withRequestLogging(start: number, req: NextRequest, res: NextResponse): NextResponse {
  const durationMs = Date.now() - start;
  // Simple console log – can be replaced by a structured logger later.
  console.log(`[${req.method}] ${req.nextUrl.pathname} - ${durationMs}ms`);
  res.headers.set('X-Request-Duration', String(durationMs));
  return res;
}
