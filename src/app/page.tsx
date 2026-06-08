"use client";

import { useEffect, useRef, useState } from "react";

const TOKEN_LIMIT = 100000;
const STORAGE_KEY = "codereview_tokens_used";

function MarkdownView({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-2 list-disc pl-5 space-y-1 text-zinc-700 dark:text-zinc-300">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flushList(index);
      elements.push(
        <h3 key={index} className="mt-4 mb-2 text-md font-bold text-zinc-900 dark:text-zinc-100">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(index);
      elements.push(
        <h2 key={index} className="mt-5 mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(index);
      elements.push(
        <h1 key={index} className="mt-6 mb-3 text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushList(index);
      const boldParts = trimmed.split("**");
      const renderedContent = boldParts.map((part, idx) =>
        idx % 2 === 1 ? <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-50">{part}</strong> : part
      );
      elements.push(
        <div key={index} className="mt-4 mb-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {renderedContent}
        </div>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.slice(2);
      const boldParts = content.split("**");
      const renderedContent = boldParts.map((part, idx) =>
        idx % 2 === 1 ? <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-50">{part}</strong> : part
      );
      listItems.push(<li key={`li-${index}`} className="text-sm leading-6">{renderedContent}</li>);
    } else if (trimmed === "") {
      flushList(index);
      elements.push(<div key={index} className="h-2" />);
    } else {
      flushList(index);
      const boldParts = line.split("**");
      const renderedContent = boldParts.map((part, idx) =>
        idx % 2 === 1 ? <strong key={idx} className="font-semibold text-zinc-900 dark:text-zinc-50">{part}</strong> : part
      );
      elements.push(
        <p key={index} className="my-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {renderedContent}
        </p>
      );
    }
  });

  flushList(lines.length);
  return <div className="space-y-1">{elements}</div>;
}

export default function Home() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [report, setReport] = useState("");
  const [promptTokens, setPromptTokens] = useState(0);
  const [completionTokens, setCompletionTokens] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  });
  const [error, setError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to review code.");
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);


  useEffect(() => {
    if (!isReviewing && (report || error)) {
      resultsHeadingRef.current?.focus();
    }
  }, [isReviewing, report, error]);

  const tokensLeft = TOKEN_LIMIT - tokensUsed;
  const isNearTokenLimit = tokensLeft <= 10000 && tokensLeft > 0;
  const hasReachedTokenLimit = tokensLeft <= 0;

  const handleReview = async () => {
    if (!code.trim()) return;
    setIsReviewing(true);
    setReport("");
    setError("");
    setPromptTokens(0);
    setCompletionTokens(0);
    setStatusMessage(`Running ${language} review. This can take a few seconds.`);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Review failed. Paste code and try again.");
        setStatusMessage("Review failed. Check the error details in results.");
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
      setStatusMessage("Review complete. Results are ready.");
    } catch {
      setError("Connection failed. Confirm the API is running, then run review again.");
      setStatusMessage("Review failed due to a connection issue.");
    }

    setIsReviewing(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </p>

      <h1 className="mb-2 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Code Review</h1>
      <p className="mb-6 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        Paste a focused code sample and get a structured review with security, readability, architecture, and logic feedback.
      </p>

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
              disabled={isReviewing}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
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
            disabled={isReviewing}
            placeholder="Paste your code here..."
            aria-describedby="review-guidance token-guidance"
            className="h-80 w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
            spellCheck={false}
          />
          <div id="review-guidance" className="rounded-lg border border-zinc-200 bg-white/80 p-3 text-xs leading-5 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
            Best results come from one function, class, or module at a time, plus enough context to understand dependencies.
          </div>

          <button
            onClick={handleReview}
            aria-busy={isReviewing}
            disabled={!code.trim() || isReviewing || hasReachedTokenLimit}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:ring-offset-zinc-950 flex items-center justify-center gap-2"
          >
            {isReviewing ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-white dark:border-t-transparent" />
                <span>Reviewing...</span>
              </>
            ) : (
              "Run Review"
            )}
          </button>

          <div
            id="token-guidance"
            className="text-xs text-zinc-600 dark:text-zinc-300"
            title="Token budget resets on page refresh. This limit prevents excessive API usage."
          >
            Tokens left: {tokensLeft.toLocaleString()} / {TOKEN_LIMIT.toLocaleString()}
            {isNearTokenLimit && (
              <span className="mt-1 block font-medium text-amber-700 dark:text-amber-300">
                Near the limit, shorter snippets help avoid interruption.
              </span>
            )}
            {hasReachedTokenLimit && (
              <span className="mt-1 block font-medium text-red-700 dark:text-red-300">
                Token limit reached for this session. Refresh the page to start a new budget.
              </span>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="flex flex-col gap-4">
          <h2
            ref={resultsHeadingRef}
            tabIndex={-1}
            className="text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950"
          >
            Results
          </h2>

          {error ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              <p className="font-medium">Review could not complete.</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs text-red-700 dark:text-red-200">
                Edit your snippet, then select “Run Review” again.
              </p>
            </div>
          ) : !report ? (
            <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                {code.trim() ? 'Click "Run Review" to analyze your code' : "Paste some code and run a review"}
              </p>
              {!code.trim() && (
                <div className="max-w-sm text-xs text-zinc-600 dark:text-zinc-300">
                  <p className="mb-2 font-medium">You will get:</p>
                  <ul className="space-y-1 pl-4">
                    <li>• Security vulnerabilities</li>
                    <li>• Code organization issues</li>
                    <li>• Readability feedback</li>
                    <li>• Architecture suggestions</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="custom-scrollbar h-[32rem] overflow-auto rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <MarkdownView text={report} />
              </div>
              {(promptTokens > 0 || completionTokens > 0) && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                    ~{(promptTokens + completionTokens).toLocaleString()} tokens ({promptTokens.toLocaleString()} in / {completionTokens.toLocaleString()} out)
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
