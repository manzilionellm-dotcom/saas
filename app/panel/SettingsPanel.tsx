"use client";

import { useState } from "react";
import type { Settings } from "../lib/db/streams-store";

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function SettingsPanel({ initialSettings }: { initialSettings: Settings }) {
  const [epgUrl, setEpgUrl] = useState(initialSettings.epgUrl ?? "");
  const [hlsBaseUrl, setHlsBaseUrl] = useState(initialSettings.hlsBaseUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/panel/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epgUrl, hlsBaseUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setMsg("Réglages enregistrés.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Serveur de diffusion (restream)
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        URL de base de votre serveur MediaMTX (ex.{" "}
        <code>https://hls.mondomaine.com</code>). Une fois renseignée, le lecteur
        web et les playlists servent la version <strong>restreamée</strong> de
        chaque chaîne : la source n&apos;est tirée qu&apos;une fois et redistribuée
        à toute la famille — plusieurs profils regardent des chaînes différentes en
        même temps sans saturer la source. Laissez vide pour lire les sources
        directement (avant la mise en place du VPS).
      </p>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <input
          className={field}
          value={hlsBaseUrl}
          onChange={(e) => setHlsBaseUrl(e.target.value)}
          placeholder="https://hls.mondomaine.com"
        />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Guide des programmes (EPG)
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Collez l&apos;URL d&apos;un guide XMLTV : StreamCast le sert sur <code>/epg.xml</code> et le
        déclare dans vos playlists. Les lecteurs (TiviMate, VLC…) affichent alors « en cours / à
        suivre » par chaîne (association via <code>tvg-id</code>).
      </p>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <input
          className={field}
          value={epgUrl}
          onChange={(e) => setEpgUrl(e.target.value)}
          placeholder="https://exemple.com/epg.xml (ou .xml.gz)"
        />
      </div>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? "…" : "Enregistrer les réglages"}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {msg && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {msg}
        </p>
      )}
    </div>
  );
}
