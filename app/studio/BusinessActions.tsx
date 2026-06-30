"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BusinessActions({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function testLLM() {
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch("/api/studio/test-llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erreur");
      const mode = data.realLLM ? "Claude (réel)" : "local (sans clé)";
      setResult(`[${mode}] ${data.response.text}`);
      router.refresh(); // rafraîchit les logs LLM affichés
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    if (!confirm("Supprimer ce business ? Action irréversible.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio/business/${businessId}`, { method: "DELETE" });
      if (res.ok) router.push("/studio");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={testLLM}
          disabled={testing}
          className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
        >
          {testing ? "Appel LLM…" : "🤖 Tester l'IA (LLMProvider)"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={deleting}
          className="rounded-xl border border-red-300 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
        >
          Supprimer
        </button>
      </div>
      {result && (
        <p className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          {result}
        </p>
      )}
    </div>
  );
}
