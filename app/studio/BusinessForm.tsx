"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business } from "../lib/db/types";

type Props = { initial?: Business };

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function BusinessForm({ initial }: Props) {
  const router = useRouter();
  const editing = !!initial;
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    businessType: initial?.businessType ?? "",
    country: initial?.country ?? "",
    locale: initial?.locale ?? "fr",
    additionalLocales: (initial?.additionalLocales ?? []).join(", "),
    targetCustomer: initial?.targetCustomer ?? "",
    budget: initial?.budget ?? "",
    mainGoal: initial?.mainGoal ?? "",
    brandVoice: initial?.brandVoice ?? "",
    notes: initial?.notes ?? "",
  });

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const payload = { ...f, additionalLocales: f.additionalLocales };
      const res = await fetch(
        editing ? `/api/studio/business/${initial!.id}` : "/api/studio/business",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");
      if (editing) {
        setMsg("Modifications enregistrées.");
        router.refresh();
      } else {
        router.push(`/studio/business/${data.business.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nom *</label>
          <input className={field} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Type de business *</label>
          <input className={field} value={f.businessType} onChange={(e) => set("businessType", e.target.value)} />
        </div>
        <div>
          <label className={label}>Pays *</label>
          <input className={field} value={f.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div>
          <label className={label}>Langue principale (locale) *</label>
          <input className={field} value={f.locale} onChange={(e) => set("locale", e.target.value)} placeholder="fr" />
        </div>
        <div>
          <label className={label}>Langues secondaires</label>
          <input className={field} value={f.additionalLocales} onChange={(e) => set("additionalLocales", e.target.value)} placeholder="ar, sv" />
        </div>
        <div>
          <label className={label}>Budget *</label>
          <input className={field} value={f.budget} onChange={(e) => set("budget", e.target.value)} placeholder="500 €/mois" />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Client cible *</label>
          <input className={field} value={f.targetCustomer} onChange={(e) => set("targetCustomer", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Objectif principal *</label>
          <input className={field} value={f.mainGoal} onChange={(e) => set("mainGoal", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Brand voice (ton, couleurs, tagline, do/don&apos;t)</label>
          <textarea className={field} rows={3} value={f.brandVoice} onChange={(e) => set("brandVoice", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notes</label>
          <textarea className={field} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{msg}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "…" : editing ? "Enregistrer" : "Créer le business"}
      </button>
    </div>
  );
}
