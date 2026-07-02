"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "m3u" | "xtream" | "direct";

const field =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const label = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function AddSourceForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("m3u");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // M3U
  const [m3uUrl, setM3uUrl] = useState("");
  const [m3uContent, setM3uContent] = useState("");
  // Xtream
  const [xtServer, setXtServer] = useState("");
  const [xtUser, setXtUser] = useState("");
  const [xtPass, setXtPass] = useState("");
  // Directe
  const [dName, setDName] = useState("");
  const [dUrl, setDUrl] = useState("");
  const [dGroup, setDGroup] = useState("");

  async function post(url: string, payload: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(String(data?.error ?? "Erreur"));
    return data as Record<string, unknown>;
  }

  async function submit() {
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      if (tab === "m3u") {
        const data = await post("/api/panel/import/m3u", {
          url: m3uUrl,
          content: m3uUrl.trim() ? "" : m3uContent,
        });
        const sources = Array.isArray(data.sources) ? data.sources : [];
        const okCount = sources.filter((s: { imported: number }) => s.imported > 0).length;
        const failed = sources.filter((s: { error?: string }) => s.error).length;
        setMsg(
          `${Number(data.imported).toLocaleString("fr-FR")} chaîne(s) importée(s)` +
            (sources.length > 1 ? ` depuis ${okCount} playlist(s)` : "") +
            (failed ? ` — ${failed} source(s) en échec` : "") +
            (data.truncated ? " (plafond atteint)" : "") +
            ".",
        );
        setM3uUrl("");
        setM3uContent("");
      } else if (tab === "xtream") {
        const data = await post("/api/panel/import/xtream", {
          server: xtServer,
          username: xtUser,
          password: xtPass,
        });
        setMsg(`${data.imported} chaîne(s) importée(s) depuis le compte Xtream.`);
        setXtServer("");
        setXtUser("");
        setXtPass("");
      } else {
        await post("/api/panel/channels", { name: dName, url: dUrl, group: dGroup });
        setMsg(`Chaîne « ${dName} » ajoutée.`);
        setDName("");
        setDUrl("");
        setDGroup("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: Tab; title: string }[] = [
    { key: "m3u", title: "Playlist M3U" },
    { key: "xtream", title: "Xtream Codes" },
    { key: "direct", title: "Chaîne directe" },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "border border-zinc-300 text-zinc-700 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {tab === "m3u" && (
          <>
            <div>
              <label className={label}>
                URL(s) de playlist (.m3u / .m3u8) — une par ligne pour en importer plusieurs
              </label>
              <textarea
                className={`${field} font-mono`}
                rows={4}
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                placeholder={"https://exemple.com/playlist-1.m3u\nhttps://exemple.com/playlist-2.m3u"}
              />
            </div>
            <div>
              <label className={label}>… ou collez le contenu d&apos;une playlist</label>
              <textarea
                className={`${field} font-mono`}
                rows={5}
                value={m3uContent}
                onChange={(e) => setM3uContent(e.target.value)}
                placeholder={"#EXTM3U\n#EXTINF:-1,Ma chaîne\nhttps://…/flux.m3u8"}
                disabled={!!m3uUrl.trim()}
              />
            </div>
          </>
        )}

        {tab === "xtream" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className={label}>Serveur (hôte:port)</label>
              <input
                className={field}
                value={xtServer}
                onChange={(e) => setXtServer(e.target.value)}
                placeholder="http://exemple.com:8080"
              />
            </div>
            <div>
              <label className={label}>Utilisateur</label>
              <input className={field} value={xtUser} onChange={(e) => setXtUser(e.target.value)} />
            </div>
            <div>
              <label className={label}>Mot de passe</label>
              <input
                type="password"
                className={field}
                value={xtPass}
                onChange={(e) => setXtPass(e.target.value)}
              />
            </div>
          </div>
        )}

        {tab === "direct" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Nom</label>
              <input
                className={field}
                value={dName}
                onChange={(e) => setDName(e.target.value)}
                placeholder="RTNB"
              />
            </div>
            <div>
              <label className={label}>URL du flux (.m3u8)</label>
              <input
                className={field}
                value={dUrl}
                onChange={(e) => setDUrl(e.target.value)}
                placeholder="https://…/live.m3u8"
              />
            </div>
            <div>
              <label className={label}>Groupe (optionnel)</label>
              <input
                className={field}
                value={dGroup}
                onChange={(e) => setDGroup(e.target.value)}
                placeholder="Burundi"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {msg && (
          <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {msg}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Import en cours…" : tab === "direct" ? "Ajouter la chaîne" : "Importer"}
        </button>
      </div>
    </div>
  );
}
