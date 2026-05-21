import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, language } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  if (code.length > 200000) {
    return NextResponse.json({ error: "Code too large (max 200,000 characters)" }, { status: 400 });
  }

  const safeLanguage = typeof language === "string" && /^[a-zA-Z0-9_\-]+$/.test(language)
    ? language
    : "plaintext";

  const prompt = `Review this ${safeLanguage} code. For each dimension rate it: ✅ Good / ⚠️ Issues / 🚨 Critical.

1. Security — vulnerabilities, input validation, exposed secrets
2. Code Organization — naming, dead code, DRY violations
3. Readability — formatting, comments, clarity
4. Architecture — separation of concerns, coupling, patterns
5. Logic — correctness, edge cases, error handling, efficiency

Then list: Top 3 fixes, then 1-2 positive highlights.

\`\`\`${safeLanguage}
${code}
\`\`\``;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
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
