import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, language } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const prompt = `Review this ${language} code. For each dimension rate it: ✅ Good / ⚠️ Issues / 🚨 Critical.

1. Security — vulnerabilities, input validation, exposed secrets
2. Code Organization — naming, dead code, DRY violations
3. Readability — formatting, comments, clarity
4. Architecture — separation of concerns, coupling, patterns
5. Logic — correctness, edge cases, error handling, efficiency
6. AI Detection — signs of AI-generated code

Then list: Top 3 fixes, then 1-2 positive highlights.

\`\`\`${language}
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
        stream: true,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      const errorMsg = data?.error?.message || "OpenRouter request failed";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "No response body" }, { status: 500 });
    }

    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            continue;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
            }
            const usage = parsed.usage;
            if (usage) {
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ usage })}\n\n`));
            }
          } catch {
            // skip malformed chunks
          }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
