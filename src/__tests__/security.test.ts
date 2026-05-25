/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  isValidApiKey,
  isValidIp,
  getClientIp,
  InMemoryStore,
  UpstashRedisStore,
  inMemoryStore,
} from '../app/api/review/middleware';
import rateLimiter from '../app/api/review/middleware';

// Mock config for some tests
jest.mock('../app/api/review/config', () => ({
  config: {
    openRouterApiKey: 'sk-or-v1-' + 'a'.repeat(64),
    rateLimitWindowMs: 10000,
    rateLimitMax: 3,
    reviewApiKeys: ['valid-test-key-12345'],
    upstashRedisRestUrl: undefined,
    upstashRedisRestToken: undefined,
    isValid: true,
    errors: [],
  },
}));

describe('Security & Rate Limiting Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    inMemoryStore.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('API Key Input Sanitization', () => {
    it('should validate correctly formatted API keys', () => {
      expect(isValidApiKey('valid-key-123')).toBe(true);
      expect(isValidApiKey('Another_Valid-Key')).toBe(true);
      expect(isValidApiKey('123456789')).toBe(true);
    });

    it('should reject API keys that are too short (< 8 chars)', () => {
      expect(isValidApiKey('short')).toBe(false);
      expect(isValidApiKey('1234567')).toBe(false);
    });

    it('should reject API keys that are too long (> 100 chars)', () => {
      const veryLongKey = 'a'.repeat(101);
      expect(isValidApiKey(veryLongKey)).toBe(false);
    });

    it('should reject API keys containing invalid or suspicious characters', () => {
      expect(isValidApiKey('key_with_spaces ')).toBe(false);
      expect(isValidApiKey('key<script>')).toBe(false);
      expect(isValidApiKey('key;SELECT')).toBe(false);
      expect(isValidApiKey('key"quote"')).toBe(false);
    });
  });

  describe('Client IP Resolution & Validation', () => {
    it('should validate correct IPv4 addresses', () => {
      expect(isValidIp('192.168.1.1')).toBe(true);
      expect(isValidIp('8.8.8.8')).toBe(true);
      expect(isValidIp('127.0.0.1')).toBe(true);
      expect(isValidIp('255.255.255.255')).toBe(true);
    });

    it('should reject malformed IPv4 addresses', () => {
      expect(isValidIp('256.1.1.1')).toBe(false);
      expect(isValidIp('1.2.3.4.5')).toBe(false);
      expect(isValidIp('192.168.1')).toBe(false);
      expect(isValidIp('abc.def.ghi.jkl')).toBe(false);
    });

    it('should validate correct IPv6 addresses', () => {
      expect(isValidIp('2001:db8::1')).toBe(true);
      expect(isValidIp('::1')).toBe(true);
      expect(isValidIp('fe80::1')).toBe(true);
    });

    it('should resolve IP using cf-connecting-ip first', () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'cf-connecting-ip': '8.8.8.8',
          'x-real-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2',
        },
      });
      expect(getClientIp(req)).toBe('8.8.8.8');
    });

    it('should resolve IP from x-forwarded-for first comma-separated entry', () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'x-forwarded-for': '12.12.12.12, 13.13.13.13',
        },
      });
      expect(getClientIp(req)).toBe('12.12.12.12');
    });

    it('should reject and skip invalid IP headers', () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'x-real-ip': 'invalid-ip-here',
          'x-forwarded-for': '9.9.9.9',
        },
      });
      expect(getClientIp(req)).toBe('9.9.9.9');
    });
  });

  describe('InMemory Rate Limiter', () => {
    it('should allow requests within rate limits', async () => {
      const store = new InMemoryStore();
      const clientKey = 'client-1';

      const res1 = await store.isRateLimited(clientKey, 2, 10000);
      expect(res1.limited).toBe(false);
      expect(res1.remaining).toBe(1);

      const res2 = await store.isRateLimited(clientKey, 2, 10000);
      expect(res2.limited).toBe(false);
      expect(res2.remaining).toBe(0);
    });

    it('should trigger rate limit when limits are exceeded', async () => {
      const store = new InMemoryStore();
      const clientKey = 'client-2';

      await store.isRateLimited(clientKey, 2, 10000);
      await store.isRateLimited(clientKey, 2, 10000);
      const res3 = await store.isRateLimited(clientKey, 2, 10000);

      expect(res3.limited).toBe(true);
      expect(res3.remaining).toBe(0);
    });

    it('should evict oldest keys when size limits are reached (OOM protection)', async () => {
      const store = new InMemoryStore();
      for (let i = 0; i < 1001; i++) {
        await store.isRateLimited(`client-${i}`, 5, 10000);
      }
      
      const res = await store.isRateLimited('client-0', 5, 10000);
      expect(res.remaining).toBe(4);
    });
  });

  describe('Upstash Redis Rate Limiter Store', () => {
    it('should correctly format commands for Redis pipeline', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { result: 1 }, // ZREMRANGEBYSCORE
          { result: 1 }, // ZADD
          { result: 2 }, // ZCARD
          { result: 1 }, // EXPIRE
        ],
      });
      global.fetch = mockFetch;

      const store = new UpstashRedisStore('https://mock-redis.upstash.io', 'mock-token');
      const res = await store.isRateLimited('test-client', 5, 60000);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://mock-redis.upstash.io/pipeline');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer mock-token');

      const body = JSON.parse(init.body);
      expect(body[0][0]).toBe('ZREMRANGEBYSCORE');
      expect(body[1][0]).toBe('ZADD');
      expect(body[2][0]).toBe('ZCARD');
      expect(body[3][0]).toBe('EXPIRE');

      expect(res.limited).toBe(false);
      expect(res.remaining).toBe(3); // 5 - 2
    });
  });

  describe('Middleware Integration & Rejections', () => {
    it('should reject malformed API keys with 400', async () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'x-api-key': 'short',
        },
      });
      const response = await rateLimiter(req);
      expect(response).toBeDefined();
      expect(response?.status).toBe(400);
      const data = await response?.json();
      expect(data.error).toBe('Invalid API key format');
    });

    it('should reject unauthorized API keys with 401', async () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'x-api-key': 'unauthorized-key-12345',
        },
      });
      const response = await rateLimiter(req);
      expect(response).toBeDefined();
      expect(response?.status).toBe(401);
      const data = await response?.json();
      expect(data.error).toBe('Invalid API key');
    });

    it('should reject unidentifiable clients (no IP and no API key) with 400', async () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {},
      });
      const response = await rateLimiter(req);
      expect(response).toBeDefined();
      expect(response?.status).toBe(400);
      const data = await response?.json();
      expect(data.error).toBe('Unable to identify client IP or API key');
    });

    it('should successfully pass rate limiter for valid keys/IPs and attach remaining header', async () => {
      const req = new NextRequest('http://localhost/api/review', {
        headers: {
          'x-api-key': 'valid-test-key-12345',
        },
      });
      const response = await rateLimiter(req);
      expect(response).toBeUndefined(); // undefined means request is allowed to continue
      expect(req.headers.get('x-ratelimit-remaining')).toBe('2'); // 3 - 1
    });
  });
});
