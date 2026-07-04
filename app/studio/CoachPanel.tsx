"use client";

import { useState } from "react";
import type { ChatMessage } from "../lib/db/types";

export default function CoachPanel({ businessId, initial }: { businessId: string; initial: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const m = input.trim();
    if (!m) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: m }]);
    setLoading(true);
    try {
      const res = await fetch("/api/studio/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, message: m }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : data?.error ?? "Erreur";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Erreur réseau." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            Ex. : « Qu&apos;est-ce qui marche le mieux ce mois-ci ? » Le coach répond avec tes vrais chiffres.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-sm text-zinc-400">Le coach réfléchit…</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Pose ta question…"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <button type="button" onClick={send} disabled={loading} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          Envoyer
        </button>
      </div>
    </div>
  );
}
