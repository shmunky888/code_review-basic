import { NextRequest, NextResponse } from "next/server";
import rateLimiter from './middleware';
import { withRequestLogging } from './logger';
import { setRateLimitHeaders } from './middleware';
import { config } from './config';

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

  try {
    const { code, language } = await req.json();

    // 2. Apply rate limiting
    const limitResponse = await rateLimiter(req);
    if (limitResponse) return limitResponse;

    const remaining = Number(req.headers.get('x-ratelimit-remaining') ?? config.rateLimitMax);

    if (!code?.trim()) {
      return setRateLimitHeaders(
        withRequestLogging(start, req, NextResponse.json({ error: "No code provided" }, { status: 400 })),
        remaining
      );
    }

    if (code.length > 50000) {
      return setRateLimitHeaders(
        withRequestLogging(start, req, NextResponse.json({ error: "Code too large (max 50,000 characters)" }, { status: 400 })),
        remaining
      );
    }

    const safeLanguage = typeof language === "string" && /^[a-zA-Z0-9_\-]+$/.test(language)
      ? language
      : "plaintext";

    // Sanitize code to prevent prompt injection via closing fenced code blocks early
    const sanitizedCode = code.replace(/```/g, '\\`\\`\\`');

    const prompt = `Review this ${safeLanguage} code. For each dimension rate it: ✅ Good / ⚠️ Issues / 🚨 Critical.

1. Security — vulnerabilities, input validation, exposed secrets
2. Code Organization — naming, dead code, DRY violations
3. Readability — formatting, comments, clarity
4. Architecture — separation of concerns, coupling, patterns
5. Logic — correctness, edge cases, error handling, efficiency

Then list: Top 3 fixes, then 1-2 positive highlights.

\`\`\`${safeLanguage}
${sanitizedCode}
\`\`\``;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openRouterApiKey}`,
      },
      body: JSON.stringify({
        model: "openrouter/owl-alpha",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      let errorMsg = "OpenRouter request failed";
      try {
        const data = await res.json();
        errorMsg = data?.error?.message || errorMsg;
      } catch {
        // Non-JSON error response
      }
      return setRateLimitHeaders(
        withRequestLogging(start, req, NextResponse.json({ error: errorMsg }, { status: 500 })),
        remaining
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    if (!content) {
      return setRateLimitHeaders(
        withRequestLogging(start, req, NextResponse.json({ error: "No content in response" }, { status: 500 })),
        remaining
      );
    }

    return setRateLimitHeaders(
      withRequestLogging(start, req, NextResponse.json({ content, usage })),
      remaining
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    const remaining = Number(req.headers.get('x-ratelimit-remaining') ?? config.rateLimitMax);
    return setRateLimitHeaders(
      withRequestLogging(start, req, NextResponse.json({ error: message }, { status: 500 })),
      remaining
    );
  }
}
