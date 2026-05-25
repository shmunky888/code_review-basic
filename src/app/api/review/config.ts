/**
 * Configuration and Secret Management for the Review API.
 * Validates and exposes environment variables at runtime with safe fallbacks and structured error reporting.
 */

export interface AppConfig {
  openRouterApiKey: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  reviewApiKeys: string[];
  upstashRedisRestUrl?: string;
  upstashRedisRestToken?: string;
  isValid: boolean;
  errors: string[];
}

function validateConfig(): AppConfig {
  const errors: string[] = [];

  // 1. OpenRouter API Key validation
  const openRouterApiKey = process.env.OPENROUTER_API_KEY ?? '';
  if (!openRouterApiKey) {
    errors.push('OPENROUTER_API_KEY is not defined in environment variables.');
  } else if (!/^sk-or-v1-[a-zA-Z0-9]{64}$/.test(openRouterApiKey)) {
    errors.push('OPENROUTER_API_KEY is malformed. Expected format: sk-or-v1- followed by 64 alphanumeric characters.');
  }

  // 2. Rate Limit Window Validation (must be positive integer)
  let rateLimitWindowMs = 60000; // Default: 1 minute
  const rawWindow = process.env.RATE_LIMIT_WINDOW_MS;
  if (rawWindow !== undefined) {
    const parsed = parseInt(rawWindow, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      rateLimitWindowMs = parsed;
    } else {
      errors.push(`RATE_LIMIT_WINDOW_MS is invalid ("${rawWindow}"). Expected a positive integer.`);
    }
  }

  // 3. Rate Limit Max Validation (must be positive integer)
  let rateLimitMax = 60; // Default: 60 requests
  const rawMax = process.env.RATE_LIMIT_MAX;
  if (rawMax !== undefined) {
    const parsed = parseInt(rawMax, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      rateLimitMax = parsed;
    } else {
      errors.push(`RATE_LIMIT_MAX is invalid ("${rawMax}"). Expected a positive integer.`);
    }
  }

  // 4. Whitelisted Review API Keys validation
  const reviewApiKeys: string[] = [];
  const rawReviewKeys = process.env.REVIEW_API_KEYS;
  if (rawReviewKeys) {
    const keys = rawReviewKeys.split(',').map((k) => k.trim());
    for (const key of keys) {
      if (!key) continue;
      // Validate incoming API key format (alphanumeric, underscore, hyphen, length 8 to 100)
      if (!/^[a-zA-Z0-9_\-]{8,100}$/.test(key)) {
        errors.push(`Whitelisted REVIEW_API_KEYS contains an invalid key format: "${key}". API keys must be alphanumeric/hyphens/underscores and between 8 and 100 characters long.`);
      } else {
        reviewApiKeys.push(key);
      }
    }
  }

  // 5. Upstash Redis configurations for serverless rate limiting (optional)
  const upstashRedisRestUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const upstashRedisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  // If one is defined, both must be defined
  if (upstashRedisRestUrl || upstashRedisRestToken) {
    if (!upstashRedisRestUrl) {
      errors.push('UPSTASH_REDIS_REST_TOKEN is defined but UPSTASH_REDIS_REST_URL is missing.');
    }
    if (!upstashRedisRestToken) {
      errors.push('UPSTASH_REDIS_REST_URL is defined but UPSTASH_REDIS_REST_TOKEN is missing.');
    }
    if (upstashRedisRestUrl && !/^https?:\/\//.test(upstashRedisRestUrl)) {
      errors.push(`UPSTASH_REDIS_REST_URL is invalid ("${upstashRedisRestUrl}"). Must be a valid HTTP/HTTPS URL.`);
    }
  }

  return {
    openRouterApiKey,
    rateLimitWindowMs,
    rateLimitMax,
    reviewApiKeys,
    upstashRedisRestUrl,
    upstashRedisRestToken,
    isValid: errors.length === 0,
    errors,
  };
}

export const config = validateConfig();
