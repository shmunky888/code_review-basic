import { NextRequest, NextResponse } from "next/server";

import rateLimiter from './middleware';

import { withRequestLogging } from './logger';
import { setRateLimitHeaders, MAX_REQUESTS } from './middleware';

export async function POST(req: NextRequest) {
  const start = Date.now();
  const { code, language } = await req.json();

  // Apply rate limiting
  const limitResponse = await rateLimiter(req);
  if (limitResponse) return limitResponse;

  if (!code?.trim()) {
    return setRateLimitHeaders(withRequestLogging(start, req, NextResponse.json({ error: "No code provided" }, { status: 400 })), MAX_REQUESTS);
  }

  if (code.length > 50000) {
    return setRateLimitHeaders(withRequestLogging(start, req, NextResponse.json({ error: "Code too large (max 50,000 characters)" }, { status: 400 })), MAX_REQUESTS);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  // OpenRouter keys are expected to be in the format 'sk-or-v1-' followed by 64 alphanumeric chars
  if (!apiKey || !/^sk-or-v1-[a-zA-Z0-9]{64}$/.test(apiKey)) {
    return setRateLimitHeaders(withRequestLogging(start, req, NextResponse.json({ error: 'OpenRouter API key is invalid or not configured' }, { status: 500 })), MAX_REQUESTS);
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

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
        // Non-JSON error response (e.g. HTML from a 502)
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    if (!content) {
      return NextResponse.json({ error: "No content in response" }, { status: 500 });
    }

    return NextResponse.json({ content, usage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
