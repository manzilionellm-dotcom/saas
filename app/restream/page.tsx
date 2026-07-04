"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type EndpointStatus = "starting" | "online" | "offline" | "error";

interface Endpoint {
  id: string;
  path: string;
  status: EndpointStatus;
  createdAt: number;
  updatedAt: number;
  failedChecks: number;
  lastError?: string;
}

interface LogEntry {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

interface SessionState {
  id: string;
  sourceHost: string;
  createdAt: number;
  upstream: { reachable: boolean; checkedAt: number; error?: string };
  endpoints: Endpoint[];
  logs: LogEntry[];
}

const STATUS_STYLES: Record<EndpointStatus, string> = {
  starting: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  online: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  offline: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export default function RestreamPage() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [count, setCount] = useState(12);
  const [session, setSession] = useState<SessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/restream", { cache: "no-store" });
      const data = await res.json();
      setSession(data.session);
    } catch {
      /* transient; keep last state */
    }
  }, []);

  // Poll status while a session exists.
  useEffect(() => {
    if (session && !pollRef.current) {
      pollRef.current = setInterval(loadStatus, 4000);
    }
    if (!session && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [session, loadStatus]);

  // Pick up an existing session on first load.
  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleRestream() {
    setError(null);
    if (!authorized) {
      setError("Please confirm you are authorized to restream this source.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/restream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, authorized, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create restreams.");
        return;
      }
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/restream/refresh", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to refresh restreams.");
        return;
      }
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStop() {
    setBusy(true);
    try {
      await fetch("/api/restream", { method: "DELETE" });
      setSession(null);
    } finally {
      setBusy(false);
    }
  }

  async function copy(ep: Endpoint) {
    try {
      await navigator.clipboard.writeText(absoluteUrl(ep.path));
      setCopiedId(ep.id);
      setTimeout(() => setCopiedId((c) => (c === ep.id ? null : c)), 1500);
    } catch {
      setError("Clipboard permission denied.");
    }
  }

  const onlineCount = session?.endpoints.filter((e) => e.status === "online").length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Restream</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Distribute <strong>your own authorized</strong> M3U source to devices around
          your home. Each device gets its own independent endpoint URL, but all of
          them are served from a <strong>single upstream connection</strong> to your
          source — so adding devices never opens extra connections to your provider or
          exceeds its limits.
        </p>
      </header>

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <label className="block text-sm font-medium" htmlFor="source">
          Authorized M3U source URL
        </label>
        <input
          id="source"
          type="url"
          inputMode="url"
          placeholder="https://your-authorized-provider.example/playlist.m3u8"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900 dark:focus:border-white/50"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm" htmlFor="count">
            Endpoints
            <select
              id="count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-lg border border-black/15 bg-white px-2 py-1 text-sm dark:border-white/20 dark:bg-zinc-900"
            >
              {Array.from({ length: 11 }, (_, i) => i + 10).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm leading-6">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            className="mt-1"
          />
          <span>
            I confirm I own or am authorized to restream this source, and that doing so
            complies with the provider&apos;s terms.
          </span>
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handleRestream}
            disabled={busy || !sourceUrl || !authorized}
            className="inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Working…" : "Restream"}
          </button>
          {session && (
            <>
              <button
                onClick={handleRefresh}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-black/15 px-5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/[.06]"
              >
                Refresh endpoints
              </button>
              <button
                onClick={handleStop}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-full border border-red-300 px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
              >
                Stop
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
      </section>

      {session && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {session.endpoints.length} endpoints · {onlineCount} online
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                session.upstream.reachable
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
              }`}
            >
              source {session.sourceHost}: {session.upstream.reachable ? "reachable" : "down"}
            </span>
          </div>

          <ul className="divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10 dark:divide-white/10 dark:border-white/15">
            {session.endpoints.map((ep) => (
              <li key={ep.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium capitalize ${STATUS_STYLES[ep.status]}`}
                >
                  {ep.status}
                </span>
                <code className="flex-1 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {absoluteUrl(ep.path)}
                </code>
                <button
                  onClick={() => copy(ep)}
                  className="shrink-0 rounded-lg border border-black/15 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]"
                >
                  {copiedId === ep.id ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>

          {session.logs.length > 0 && (
            <details className="mt-6 rounded-xl border border-black/10 dark:border-white/15">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Activity log
              </summary>
              <div className="max-h-56 overflow-y-auto border-t border-black/10 px-4 py-3 dark:border-white/10">
                {session.logs
                  .slice()
                  .reverse()
                  .map((l, i) => (
                    <p
                      key={i}
                      className="font-mono text-xs leading-6 text-zinc-600 dark:text-zinc-400"
                    >
                      <span
                        className={
                          l.level === "error"
                            ? "text-red-600 dark:text-red-400"
                            : l.level === "warn"
                              ? "text-amber-600 dark:text-amber-400"
                              : ""
                        }
                      >
                        {l.level}
                      </span>{" "}
                      {new Date(l.ts).toLocaleTimeString()} — {l.message}
                    </p>
                  ))}
              </div>
            </details>
          )}
        </section>
      )}
    </main>
  );
}
