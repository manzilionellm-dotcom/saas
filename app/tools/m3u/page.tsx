"use client";

import { useState } from "react";
import Link from "next/link";
import { cloneM3U } from "../../lib/m3u";

const EXAMPLE = `#EXTM3U
#EXTINF:-1 tvg-logo="https://exemple.com/logo-sport.png" group-title="Sport",Ma Chaîne Sport
https://moncdn.com/live/sport/index.m3u8
#EXTINF:-1 tvg-logo="https://exemple.com/logo-info.png" group-title="Info",Ma Chaîne Info
https://moncdn.com/live/info/index.m3u8`;

export default function M3UToolPage() {
  const [source, setSource] = useState(EXAMPLE);
  const [count, setCount] = useState(2);
  const [labelVariants, setLabelVariants] = useState(true);
  const [copies, setCopies] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClone() {
    setError(null);
    const input = source.trim();

    // Si on colle une URL (ex. lien get.php d'abonnement), on la télécharge
    // côté serveur, puis on clone le contenu récupéré.
    let m3uText = input;
    if (/^https?:\/\//i.test(input)) {
      setLoading(true);
      try {
        const res = await fetch("/api/m3u/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Échec du téléchargement de la playlist.");
          setCopies([]);
          return;
        }
        m3uText = data.content as string;
        setSource(m3uText); // affiche la playlist récupérée dans le champ
      } catch {
        setError("Erreur réseau pendant le téléchargement de la playlist.");
        setCopies([]);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (!m3uText.trim().toUpperCase().includes("#EXTM3U")) {
      setError("Le texte ne ressemble pas à un M3U (ligne #EXTM3U manquante).");
      setCopies([]);
      return;
    }
    setCopies(cloneM3U(m3uText, count, { labelVariants }));
  }

  function download(text: string, index: number) {
    const blob = new Blob([text], { type: "audio/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `playlist-v${index + 1}.m3u`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Retour au catalogue
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Cloneur de playlist M3U
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Collez le <strong>contenu</strong> d&apos;une playlist M3U <em>ou</em> son{" "}
          <strong>URL</strong> (lien <code>get.php…</code>) — elle sera téléchargée
          automatiquement. Choisissez le nombre de copies et récupérez les variantes.
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠️ À utiliser uniquement avec du contenu que vous possédez ou dont
          vous détenez les droits.
        </p>

        <label className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Playlist M3U source (contenu ou URL)
        </label>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />

        <div className="mt-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre de copies :
            </span>
            {[2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${
                  count === n
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={labelVariants}
              onChange={(e) => setLabelVariants(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            Étiqueter les variantes (V1, V2…)
          </label>

          <button
            type="button"
            onClick={handleClone}
            disabled={loading}
            className="ml-auto rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Téléchargement…" : "Cloner"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {copies.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {copies.length} copies générées
            </h2>
            {copies.map((copy, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    playlist-v{i + 1}.m3u
                  </span>
                  <button
                    type="button"
                    onClick={() => download(copy, i)}
                    className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Télécharger
                  </button>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-5 text-zinc-800 dark:text-zinc-200">
                  {copy}
                </pre>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
