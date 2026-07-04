"use client";

import { useState } from "react";

// Section bien visible « Playlist prête à l'emploi » : donne le lien M3U du
// catalogue complet (restreamé si le serveur de diffusion est réglé), à coller
// directement dans VLC / TiviMate / tout lecteur IPTV.
export default function PlaylistsReady({ restreamOn }: { restreamOn: boolean }) {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const allUrl = `${base}/playlist/all`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(allUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // presse-papiers indisponible : l'utilisateur peut copier le champ manuellement
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        📺 Playlist restreamée — prête à l&apos;emploi
      </h2>

      {restreamOn ? (
        <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          ✅ Restream actif : vos chaînes passent par le serveur de diffusion (source tirée une
          fois, redistribuée à toute la famille).
        </p>
      ) : (
        <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
          ⚠️ Serveur de diffusion non réglé : ce lien sert les sources d&apos;origine. Renseignez
          l&apos;« URL du serveur de diffusion » dans les Réglages ci-dessous pour activer le
          restream.
        </p>
      )}

      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
        Collez ce lien dans <strong>VLC</strong>, <strong>TiviMate</strong> ou tout lecteur IPTV —
        il contient <strong>toutes vos chaînes</strong> :
      </p>

      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={allUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full truncate rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <li>
          ▶ Pour regarder tout de suite dans le navigateur : le lien{" "}
          <code>/playlist/all</code> ci-dessus, ou les liens <strong>par profil</strong> dans la
          section « Profils famille ».
        </li>
        <li>
          👨‍👩‍👧 Chaque personne a son propre lien (section Profils) : plusieurs peuvent regarder des
          chaînes différentes en même temps.
        </li>
        <li>
          🔁 Après chaque ajout/suppression de chaînes, cliquez « Restreamer toutes les chaînes »
          (plus bas) pour mettre le serveur de diffusion à jour.
        </li>
      </ul>
    </div>
  );
}
