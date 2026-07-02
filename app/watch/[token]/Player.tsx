"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

type Channel = { id: string; name: string; logo: string | null; group: string | null; url: string };

export default function Player({ token }: { token: string }) {
  const [profile, setProfile] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [current, setCurrent] = useState<Channel | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Charge la liste des chaînes du profil.
  useEffect(() => {
    let alive = true;
    fetch(`/api/watch/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? "Erreur");
        if (!alive) return;
        setProfile(d.profile);
        setChannels(d.channels);
        setCurrent(d.channels[0] ?? null);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Erreur"));
    return () => {
      alive = false;
    };
  }, [token]);

  // (Re)charge le flux quand on change de chaîne.
  // (L'effacement d'erreur se fait dans selectChannel, pas ici : on évite tout
  //  setState synchrone dans l'effet.)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(current.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setPlayError("Flux indisponible ou bloqué par le navigateur (CORS).");
      });
    } else {
      // Safari / iOS : HLS natif. Sur les navigateurs sans support, l'événement
      // onError de la balise <video> affichera le message.
      video.src = current.url;
    }
    video.play().catch(() => {
      /* l'autoplay peut être bloqué : l'utilisateur cliquera sur lecture */
    });

    return () => {
      if (hls) hls.destroy();
    };
  }, [current]);

  function selectChannel(c: Channel) {
    setPlayError(null);
    setCurrent(c);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? channels.filter((c) => c.name.toLowerCase().includes(q)) : channels;
  }, [channels, search]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-zinc-300">
        <div>
          <p className="text-2xl">📡</p>
          <p className="mt-2 font-medium">Lien invalide ou révoqué.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Demandez un nouveau lien à l&apos;administrateur du panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 lg:h-screen lg:flex-row">
      {/* Lecteur */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-400">
            📡 StreamCast{profile ? ` · ${profile}` : ""}
          </span>
          <span className="text-xs text-zinc-500">{channels.length} chaîne(s)</span>
        </div>
        <div className="relative flex flex-1 items-center justify-center bg-black">
          <video
            ref={videoRef}
            controls
            playsInline
            onError={() => setPlayError("Flux indisponible ou format non lisible par le navigateur.")}
            className="max-h-[60vh] w-full lg:max-h-full"
          />
          {playError && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-red-950/80 px-4 py-2 text-sm text-red-200">
              {playError}
            </p>
          )}
        </div>
        {current && (
          <div className="flex items-center gap-3 px-4 py-3">
            {current.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.logo} alt="" className="h-9 w-9 rounded object-contain" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded bg-zinc-800">📺</span>
            )}
            <div>
              <p className="font-medium">{current.name}</p>
              {current.group && <p className="text-xs text-zinc-500">{current.group}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Liste des chaînes */}
      <aside className="flex w-full flex-col border-t border-zinc-800 lg:w-80 lg:border-l lg:border-t-0">
        <div className="p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 Rechercher…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => selectChannel(c)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-900 ${
                  current?.id === c.id ? "bg-indigo-950/50" : ""
                }`}
              >
                {c.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo} alt="" className="h-7 w-7 shrink-0 rounded object-contain" loading="lazy" />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-800 text-xs">
                    📺
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{c.name}</span>
                  {c.group && <span className="block truncate text-xs text-zinc-500">{c.group}</span>}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">Aucune chaîne.</li>
          )}
        </ul>
      </aside>
    </div>
  );
}
