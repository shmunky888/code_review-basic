"use client";


import { useState, useEffect } from "react";

const TOKEN_LIMIT = 100000;
const STORAGE_KEY = "codereview_tokens_used";

function MarkdownView({ text }: { text: string }) {
  const lines = text.split("\n");
  let inList = false;
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
      inList = false;
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
      inList = true;
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
  const [tokensUsed, setTokensUsed] = useState(0);
  const [error, setError] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? Number(stored) : 0;
    if (Number.isFinite(parsed) && parsed > 0) {
      setTokensUsed(parsed);
    }
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
    } catch (err) {
      console.error('Review API fetch failed:', err);
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
              disabled={isReviewing}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="h-80 w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 p-4 font-mono text-sm leading-6 text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            Estimated tokens left: {(TOKEN_LIMIT - tokensUsed).toLocaleString()} / {TOKEN_LIMIT.toLocaleString()}
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
              <MarkdownView text={report} />
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
