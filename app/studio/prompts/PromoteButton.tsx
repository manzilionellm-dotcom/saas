"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PromoteButton({ kind, version, isDefault }: { kind: string; version: string; isDefault: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (isDefault) {
    return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">par défaut ✓</span>;
  }

  async function promote() {
    setBusy(true);
    try {
      await fetch("/api/studio/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, version }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={promote}
      disabled={busy}
      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300"
    >
      Définir par défaut
    </button>
  );
}
