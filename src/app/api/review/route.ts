import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, language } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const prompt = `You are a senior software engineer conducting a thorough code review. Analyze the provided code across the following 6 dimensions and return a structured report.

---

## 🔍 CODE REVIEW REPORT

### 1. 🔐 Security
- Identify any vulnerabilities (injection, XSS, CSRF, insecure storage, exposed secrets/API keys, etc.)
- Check input validation and sanitization
- Review authentication & authorization logic
- Flag hardcoded credentials or sensitive data
- Rate: ✅ Safe / ⚠️ Minor Issues / 🚨 Critical Issues

### 2. 📐 Code Organization & Cleanliness
- Evaluate naming conventions (variables, functions, classes)
- Check for dead code, commented-out blocks, or unused imports
- Assess function/method length and single-responsibility adherence
- Look for code duplication (DRY principle violations)
- Rate: ✅ Clean / ⚠️ Needs Tidying / 🚨 Messy

### 3. 🎨 Code Aesthetics & Style
- Check consistent formatting (indentation, spacing, line length)
- Evaluate comment quality — are they helpful, outdated, or missing?
- Assess readability: can a new developer understand this easily?
- Flag inconsistent style patterns
- Rate: ✅ Polished / ⚠️ Inconsistent / 🚨 Hard to Read

### 4. 🏗️ Architecture & Design
- Review separation of concerns and layering
- Identify tight coupling or poor abstraction
- Check for appropriate design patterns (or misused ones)
- Evaluate scalability and maintainability of the structure
- Flag God objects, circular dependencies, or spaghetti architecture
- Rate: ✅ Well-Designed / ⚠️ Could Be Improved / 🚨 Poor Structure

### 5. 🧠 Logic & Correctness
- Trace through the logic for correctness and edge cases
- Identify off-by-one errors, null/undefined risks, or race conditions
- Check error handling — are exceptions caught and handled properly?
- Evaluate algorithm efficiency (unnecessary loops, O(n²) risks, etc.)
- Rate: ✅ Solid / ⚠️ Potential Bugs / 🚨 Logic Errors Found

### 6. 🤖 AI-Generated Code Detection
- Assess whether the code shows signs of AI generation:
  - Overly verbose comments explaining obvious things
  - Generic variable names (data, result, item, temp)
  - Boilerplate-heavy structure with little customization
  - Inconsistent style that suggests copy-paste from multiple generations
  - Patterns that are technically correct but unnecessarily complex
  - Missing domain-specific context or business logic depth
- Verdict: ✅ Likely Human-Written / 🤖 Possibly AI-Assisted / 🤖🤖 Strongly AI-Generated

## 🛠️ Top 3 Priority Fixes
1. [Most critical issue]
2. [Second priority]
3. [Third priority]

## 💡 Positive Highlights
- [What was done well]

---

Now review the following ${language} code:

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
        max_tokens: 100000,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMsg = data?.error?.message || "OpenRouter request failed";
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    const report = data.choices?.[0]?.message?.content;
    const usage = data.usage;

    if (!report) {
      return NextResponse.json({ error: "No response from model", raw: data }, { status: 500 });
    }

    return NextResponse.json({ report, usage });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
