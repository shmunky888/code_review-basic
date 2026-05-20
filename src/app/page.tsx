"use client";

import { useState, useEffect } from "react";

const TOKEN_LIMIT = 100000;
const STORAGE_KEY = "codereview_tokens_used";

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [report, setReport] = useState("");
  const [promptTokens, setPromptTokens] = useState(0);
  const [completionTokens, setCompletionTokens] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [error, setError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTokensUsed(Number(stored));
  }, []);

  const handleReview = async () => {
    if (!code.trim()) return;
    setIsReviewing(true);
    setReport("");
    setError("");
    setPromptTokens(0);
    setCompletionTokens(0);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Review failed");
        setIsReviewing(false);
        return;
      }

      const data = await res.json();
      const fullReport = data.content;
      const usage = data.usage || null;

      setReport(fullReport);

      const pTokens = usage?.prompt_tokens ?? Math.ceil(code.length / 4);
      const cTokens = usage?.completion_tokens ?? Math.ceil(fullReport.length / 4);
      setPromptTokens(pTokens);
      setCompletionTokens(cTokens);
      setTokensUsed((prev) => {
        const next = prev + pTokens + cTokens;
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    } catch {
      setError("Failed to connect to review API");
    }

    setIsReviewing(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">Code Review</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Code input */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="lang" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Language
            </label>
            <select
              id="lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
            </select>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your code here..."
            className="h-80 w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            spellCheck={false}
          />

          <button
            onClick={handleReview}
            disabled={!code.trim() || isReviewing || tokensUsed >= TOKEN_LIMIT}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isReviewing ? "Reviewing..." : "Run Review"}
          </button>

          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Tokens left: {(TOKEN_LIMIT - tokensUsed).toLocaleString()} / {TOKEN_LIMIT.toLocaleString()}
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Results</h2>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          ) : !report ? (
            <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="text-sm text-zinc-500">
                {code.trim()
                  ? 'Click "Run Review" to analyze your code'
                  : "Paste some code and run a review"}
              </p>
            </div>
          ) : (
            <>
            <div className="custom-scrollbar h-[32rem] overflow-auto rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-zinc-800 dark:text-zinc-200">
                {report}
              </pre>
            </div>
            {(promptTokens > 0 || completionTokens > 0) && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  ~{(promptTokens + completionTokens).toLocaleString()} tokens
                  ({promptTokens.toLocaleString()} in / {completionTokens.toLocaleString()} out)
                </span>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
