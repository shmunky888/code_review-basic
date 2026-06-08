import { NextRequest, NextResponse } from "next/server";
import rateLimiter from './middleware';
import { withRequestLogging } from './logger';
import { setRateLimitHeaders } from './middleware';
import { config } from './config';

const MAX_BODY_BYTES = 100 * 1024; // 100 KB
const OPENROUTER_TIMEOUT_MS = 30_000; // 30 seconds

type ErrorBody = { error: string };

function jsonResponse(
  start: number,
  req: NextRequest,
  body: ErrorBody,
  status: number,
  remaining: number
) {
  return setRateLimitHeaders(
    withRequestLogging(start, req, NextResponse.json(body, { status })),
    remaining
  );
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Centralized Secret/Config Validation check
  if (!config.isValid) {
    return withRequestLogging(
      start,
      req,
      NextResponse.json(
        { error: `Server configuration error: ${config.errors.join('; ')}` },
        { status: 500 }
      )
    );
  }

  // 2. Validate Content-Length header to reject oversized payloads early
  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return jsonResponse(start, req, { error: "Request body too large" }, 413, config.rateLimitMax);
  }

  let code: string;
  let language: string;

  try {
    const body = await req.json();
    code = body.code;
    language = body.language;
  } catch {
    return jsonResponse(start, req, { error: "Invalid JSON payload" }, 400, config.rateLimitMax);
  }

  try {
    // 3. Apply rate limiting
    const limitResponse = await rateLimiter(req);
    if (limitResponse) return limitResponse;

    const remaining = Number(req.headers.get('x-ratelimit-remaining') ?? config.rateLimitMax);

    if (!code?.trim()) {
      return jsonResponse(start, req, { error: "No code provided" }, 400, remaining);
    }

    if (code.length > 50000) {
      return jsonResponse(start, req, { error: "Code too large (max 50,000 characters)" }, 400, remaining);
    }

    const safeLanguage = typeof language === "string" && /^[a-zA-Z0-9_\-]+$/.test(language)
      ? language
      : "plaintext";

    // Sanitize user input to prevent custom delimiter injection/escaping
    const sanitizedCode = code
      .replace(/\[\[CODE_START\]\]/g, "")
      .replace(/\[\[CODE_END\]\]/g, "");

    const systemInstruction = `You are a code review assistant. Review ONLY the code between [[CODE_START]] and [[CODE_END]] in the user message.

Respond with these sections:
1. Security — vulnerabilities, input validation, exposed secrets
2. Code Organization — naming, dead code, DRY violations
3. Readability — formatting, comments, clarity
4. Architecture — separation of concerns, coupling, patterns
5. Logic — correctness, edge cases, error handling, efficiency

Rate each dimension: ✅ Good / ⚠️ Issues / 🚨 Critical.
Then list: Top 3 fixes, then 1-2 positive highlights.`;

    const userPrompt = `[[CODE_START]]
${safeLanguage}:
${sanitizedCode}
[[CODE_END]]`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openRouterApiKey}`,
      },
      body: JSON.stringify({
        model: config.openRouterModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = "OpenRouter request failed";
      try {
        const data = await res.json();
        errorMsg = data?.error?.message || errorMsg;
      } catch {
        // Non-JSON error response
      }
      return jsonResponse(start, req, { error: errorMsg }, 500, remaining);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    if (!content) {
      return jsonResponse(start, req, { error: "No content in response" }, 500, remaining);
    }

    return setRateLimitHeaders(
      withRequestLogging(start, req, NextResponse.json({ content, usage })),
      remaining
    );
  } catch (err: unknown) {
    const remaining = Number(req.headers.get('x-ratelimit-remaining') ?? config.rateLimitMax);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return jsonResponse(
      start,
      req,
      { error: isTimeout ? "Review request timed out" : "Review failed" },
      isTimeout ? 504 : 500,
      remaining
    );
  }
}
