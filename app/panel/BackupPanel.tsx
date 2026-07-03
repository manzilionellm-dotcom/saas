"use client";

import { useRef, useState } from "react";

// Sauvegarde / restauration de tout le montage (chaînes, profils, catégories,
// réglages) en un fichier JSON. Le serveur pouvant être ré-installé, cette
// copie hors serveur protège tout le travail de configuration.
export default function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function restore(file: File) {
    if (
      !window.confirm(
        "Restaurer cette sauvegarde ? Cela REMPLACE toutes les chaînes, profils et catégories actuels.",
      )
    ) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/panel/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
      setMsg(
        `Restauré : ${data.channels} chaîne(s), ${data.profiles} profil(s), ${data.bouquets} catégorie(s). Rechargement…`,
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Sauvegarde &amp; restauration
      </h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Téléchargez une copie de tout votre montage (chaînes, profils, catégories,
        réglages) et gardez-la en lieu sûr. En cas de ré-installation du serveur,
        réimportez-la pour tout retrouver. <strong>La restauration remplace l&apos;état actuel.</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="/api/panel/backup"
          className="rounded-xl bg-indigo-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          ⬇ Télécharger la sauvegarde
        </a>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-zinc-300 px-5 py-2 font-medium text-zinc-700 transition-colors hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
        >
          {busy ? "Restauration…" : "⬆ Restaurer une sauvegarde"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) restore(f);
          }}
        />
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
