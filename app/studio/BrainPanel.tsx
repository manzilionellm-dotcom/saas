"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BrainPanel({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(path: string, key: string) {
    setBusy(key);
    try {
      await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => run("/api/studio/brief", "brief")}
        disabled={busy !== null}
        className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy === "brief" ? "…" : "📋 Générer le brief du jour"}
      </button>
      <button
        type="button"
        onClick={() => run("/api/studio/decision", "decision")}
        disabled={busy !== null}
        className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
      >
        {busy === "decision" ? "…" : "🎯 Décisions du jour"}
      </button>
    </div>
  );
}
