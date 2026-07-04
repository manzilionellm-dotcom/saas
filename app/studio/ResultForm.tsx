"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inp =
  "w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export default function ResultForm({ generationId }: { generationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ views: "", likes: "", clicks: "", conversions: "", note: "" });

  function set(k: keyof typeof f, v: string) {
    setF((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/studio/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, ...f }),
      });
      if (res.ok) {
        setDone(true);
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
        {done ? "+ Ajouter un autre résultat" : "+ Saisir les perfs réelles"}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {(["views", "likes", "clicks", "conversions"] as const).map((k) => (
        <label key={k} className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
          {k}
          <input type="number" min="0" className={inp} value={f[k]} onChange={(e) => set(k, e.target.value)} />
        </label>
      ))}
      <button type="button" onClick={save} disabled={saving} className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
        {saving ? "…" : "Enregistrer"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400">annuler</button>
    </div>
  );
}
