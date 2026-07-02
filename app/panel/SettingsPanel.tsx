"use client";

import { useState } from "react";
import type { Settings } from "../lib/db/streams-store";

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function SettingsPanel({ initialSettings }: { initialSettings: Settings }) {
  const [epgUrl, setEpgUrl] = useState(initialSettings.epgUrl ?? "");
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
        body: JSON.stringify({ epgUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setMsg(epgUrl ? "EPG enregistré. Guide servi sur /epg.xml." : "EPG désactivé.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Guide des programmes (EPG)
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Collez l&apos;URL d&apos;un guide XMLTV : StreamCast le sert sur <code>/epg.xml</code> et le
        déclare dans vos playlists. Les lecteurs (TiviMate, VLC…) affichent alors « en cours / à
        suivre » par chaîne (association via <code>tvg-id</code>).
      </p>
      <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <input
          className={field}
          value={epgUrl}
          onChange={(e) => setEpgUrl(e.target.value)}
          placeholder="https://exemple.com/epg.xml (ou .xml.gz)"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "…" : "Enregistrer"}
        </button>
      </div>
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
