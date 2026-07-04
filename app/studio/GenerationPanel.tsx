"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS, KINDS } from "../lib/prompts";

type Props = { businessId: string; locales: string[] };

const sel =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function GenerationPanel({ businessId, locales }: Props) {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [kind, setKind] = useState<string>(KINDS[0].key);
  const [locale, setLocale] = useState<string>(locales[0] ?? "fr");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate(useLocale = locale) {
    setError(null);
    setOutput(null);
    setCopied(false);
    setLoading(true);
    try {
      const res = await fetch("/api/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, platform, kind, locale: useLocale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");
      setLocale(useLocale);
      setOutput(data.generation.output);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const otherLocales = locales.filter((l) => l !== locale);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Plateforme
          <select className={sel} value={platform} onChange={(e) => setPlatform(e.target.value)}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Livrable
          <select className={sel} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Langue
          <select className={sel} value={locale} onChange={(e) => setLocale(e.target.value)}>
            {locales.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => generate()}
          disabled={loading}
          className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? "Génération…" : "Générer"}
        </button>
        <div className="ml-auto flex gap-3 text-xs">
          <a href={`/api/studio/export?businessId=${businessId}&format=json`} className="text-indigo-600 hover:underline dark:text-indigo-400">⬇ JSON</a>
          <a href={`/api/studio/export?businessId=${businessId}&format=csv`} className="text-indigo-600 hover:underline dark:text-indigo-400">⬇ CSV</a>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {output && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-3">
            <button type="button" onClick={copy} className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-300">
              {copied ? "Copié ✓" : "Copier"}
            </button>
            {otherLocales.map((l) => (
              <button key={l} type="button" onClick={() => generate(l)} className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-300">
                Régénérer en {l}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
