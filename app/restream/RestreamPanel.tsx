"use client";

import { useCallback, useEffect, useState } from "react";

type Status = "starting" | "online" | "offline" | "error";

type Endpoint = {
  id: string;
  url: string;
  status: Status;
  lastError: string | null;
  lastCheckedAt: number | null;
};

type Payload = {
  source: { name: string; configured: boolean };
  endpoints: Endpoint[];
};

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  starting: { label: "Démarrage", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  online: { label: "En ligne", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  offline: { label: "Hors ligne", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  error: { label: "Erreur", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}

export default function RestreamPanel({ initial }: { initial: Payload }) {
  const [data, setData] = useState<Payload>(initial);
  const [busy, setBusy] = useState<null | "generate" | "refresh">(null);

  const post = useCallback(async (action: "generate" | "refresh") => {
    setBusy(action);
    try {
      const res = await fetch("/api/restream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setData(await res.json());
    } finally {
      setBusy(null);
    }
  }, []);

  // Poll status while endpoints exist so badges reflect live source health.
  useEffect(() => {
    if (data.endpoints.length === 0) return;
    const id = setInterval(async () => {
      const res = await fetch("/api/restream", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    }, 5000);
    return () => clearInterval(id);
  }, [data.endpoints.length]);

  const hasEndpoints = data.endpoints.length > 0;

  return (
    <div>
      {!data.source.configured && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Aucune source autorisée n&apos;est configurée. Définissez la variable
          d&apos;environnement <code className="font-mono">RESTREAM_SOURCE_URL</code> avec
          l&apos;URL M3U/M3U8 que vous êtes autorisé à rediffuser. Les endpoints
          resteront hors ligne tant qu&apos;elle est absente.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => post("generate")}
          disabled={busy !== null}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy === "generate" ? "Génération…" : "Restream (générer les liens)"}
        </button>
        <button
          type="button"
          onClick={() => post("refresh")}
          disabled={busy !== null || !hasEndpoints}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {busy === "refresh" ? "Actualisation…" : "Régénérer / vérifier"}
        </button>
        {hasEndpoints && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.endpoints.length} liens · source : {data.source.name}
          </span>
        )}
      </div>

      {hasEndpoints ? (
        <ul className="mt-6 flex flex-col gap-2">
          {data.endpoints.map((ep, i) => (
            <li
              key={ep.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="w-8 shrink-0 text-center text-sm font-semibold text-zinc-400">
                {i + 1}
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-800 dark:text-zinc-200">
                {ep.url}
              </code>
              <StatusBadge status={ep.status} />
              <CopyButton value={ep.url} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Cliquez sur « Restream » pour générer un jeu de liens indépendants, un
          par appareil de la maison.
        </p>
      )}
    </div>
  );
}
