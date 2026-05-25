import { NextRequest, NextResponse } from 'next/server';
import { config } from './config';

// Store timestamps (ms) for each key, capped to limit memory footprint.
export const MAX_REQUESTS = config.rateLimitMax;

/**
 * Returns a NextResponse with rate limit headers set.
 */
export const setRateLimitHeaders = (res: NextResponse, remaining: number) => {
  res.headers.set('X-RateLimit-Limit', String(config.rateLimitMax));
  res.headers.set('X-RateLimit-Remaining', String(remaining));
  return res;
};

/**
 * Validates the format and length of the API key.
 * API keys must be alphanumeric, underscores, or hyphens, and between 8 and 100 characters.
 */
export function isValidApiKey(key: string): boolean {
  return /^[a-zA-Z0-9_\-]{8,100}$/.test(key);
}

/**
 * Validates the format of IPv4 or IPv6 address.
 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Resolves the client IP by inspecting standard proxy headers in order of trustworthiness.
 */
export function getClientIp(req: NextRequest): string | null {
  const headersToCheck = [
    'cf-connecting-ip',
    'x-client-ip',
    'x-real-ip',
    'x-forwarded-for',
  ];

  for (const header of headersToCheck) {
    const value = req.headers.get(header);
    if (value) {
      if (header === 'x-forwarded-for') {
        const ip = value.split(',')[0].trim();
        if (isValidIp(ip)) return ip;
      } else {
        const ip = value.trim();
        if (isValidIp(ip)) return ip;
      }
    }
  }

  const reqIp = (req as any).ip;
  if (reqIp && isValidIp(reqIp)) {
    return reqIp;
  }

  return null;
}

export interface RateLimitStore {
  isRateLimited(key: string, limit: number, windowMs: number): Promise<{ limited: boolean; remaining: number }>;
}

/**
 * In-memory sliding window rate limiter with OOM bounded size mitigation.
 */
export class InMemoryStore implements RateLimitStore {
  private requestMap = new Map<string, number[]>();
  private maxKeys = 1000;

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<{ limited: boolean; remaining: number }> {
    const now = Date.now();
    const timestamps = this.requestMap.get(key) ?? [];

    const recent = timestamps.filter((t) => now - t < windowMs);
    recent.push(now);

    if (!this.requestMap.has(key) && this.requestMap.size >= this.maxKeys) {
      const oldestKey = this.requestMap.keys().next().value;
      if (oldestKey !== undefined) {
        this.requestMap.delete(oldestKey);
      }
    }

    this.requestMap.delete(key);
    this.requestMap.set(key, recent);

    const count = recent.length;
    const remaining = Math.max(0, limit - count);

    return {
      limited: count > limit,
      remaining,
    };
  }

  clear() {
    this.requestMap.clear();
  }
}

/**
 * Upstash Redis-backed rate limiter using pipeline fetches to minimize network latency.
 */
export class UpstashRedisStore implements RateLimitStore {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  async isRateLimited(key: string, limit: number, windowMs: number): Promise<{ limited: boolean; remaining: number }> {
    const now = Date.now();
    const clearBefore = now - windowMs;
    const redisKey = `ratelimit:${key}`;
    const ttlSeconds = Math.ceil(windowMs / 1000) + 10;
    const uniqueMember = `${now}-${Math.random().toString(36).substring(2, 8)}`;

    const response = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['ZREMRANGEBYSCORE', redisKey, '-inf', `(${clearBefore}`],
        ['ZADD', redisKey, String(now), uniqueMember],
        ['ZCARD', redisKey],
        ['EXPIRE', redisKey, String(ttlSeconds)],
      ]),
    });

    if (!response.ok) {
      throw new Error(`Upstash Redis REST API failed: ${response.statusText}`);
    }

    const results = await response.json();
    const countResult = results[2];
    if (countResult.error) {
      throw new Error(`Upstash Redis command error: ${countResult.error}`);
    }

    const count = Number(countResult.result);
    const remaining = Math.max(0, limit - count);

    return {
      limited: count > limit,
      remaining,
    };
  }
}

export const inMemoryStore = new InMemoryStore();
let activeStore: RateLimitStore = inMemoryStore;

if (config.upstashRedisRestUrl && config.upstashRedisRestToken) {
  activeStore = new UpstashRedisStore(config.upstashRedisRestUrl, config.upstashRedisRestToken);
}

export default async function rateLimiter(req: NextRequest): Promise<NextResponse | undefined> {
  try {
    const apiKey = req.headers.get('x-api-key')?.trim();
    
    // 1. Sanitize & validate the API key format if provided
    if (apiKey !== undefined && apiKey !== '') {
      if (!isValidApiKey(apiKey)) {
        return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
      }

      // If a whitelist of keys is defined, reject unknown keys
      if (config.reviewApiKeys.length && !config.reviewApiKeys.includes(apiKey)) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }
    }

    // 2. Resolve client IP robustly
    const clientIp = getClientIp(req);
    const clientKey = apiKey || clientIp;

    // Reject unidentifiable requests to prevent rate limit bypass
    if (!clientKey) {
      return NextResponse.json({ error: 'Unable to identify client IP or API key' }, { status: 400 });
    }

    // 3. Execute Rate Limit Check with Redis (and in-memory fallback)
    let rateLimitResult;
    try {
      rateLimitResult = await activeStore.isRateLimited(clientKey, config.rateLimitMax, config.rateLimitWindowMs);
    } catch (err) {
      console.warn('Rate limit store error, falling back to in-memory store:', err);
      rateLimitResult = await inMemoryStore.isRateLimited(clientKey, config.rateLimitMax, config.rateLimitWindowMs);
    }

    // 4. Pass the remaining count back using request headers
    req.headers.set('x-ratelimit-remaining', String(rateLimitResult.remaining));

    if (rateLimitResult.limited) {
      return setRateLimitHeaders(
        NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
        0
      );
    }

    return undefined;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Rate Limiter Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
