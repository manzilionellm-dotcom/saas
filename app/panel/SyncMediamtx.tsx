"use client";

import { useState } from "react";

// Bouton « Restreamer toutes les chaînes » : pousse le catalogue du panel vers
// le serveur de diffusion MediaMTX (voir /api/panel/mediamtx/sync).
export default function SyncMediamtx() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/panel/mediamtx/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setMsg(
        `${data.channels} chaîne(s) poussée(s) vers le serveur de diffusion. ` +
          "Toutes sont désormais restreamées à la demande — chacun regarde ce qu'il veut.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Restreamer toutes les chaînes
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Déclare toutes vos chaînes dans le serveur de diffusion MediaMTX (mode à
        la demande : une chaîne n&apos;est tirée que si quelqu&apos;un la regarde).
        Chaque profil peut alors ouvrir n&apos;importe quelle chaîne, et plusieurs
        profils regardent des chaînes différentes en même temps sans saturer la
        source. <strong>À relancer après chaque ajout ou suppression de chaînes.</strong>
      </p>
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="mt-3 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? "Synchronisation…" : "Restreamer toutes les chaînes"}
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
