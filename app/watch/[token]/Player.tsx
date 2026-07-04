"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

type Channel = {
  id: string;
  name: string;
  logo: string | null;
  group: string | null;
  url: string;
  backupUrl?: string | null;
};

// Réglages hls.js orientés STABILITÉ (TV en direct) plutôt que latence minimale :
// un tampon large absorbe la gigue réseau et les à-coups de la source, et on
// autorise de nombreux ré-essais de chargement avant de considérer un segment perdu.
const HLS_CONFIG = {
  enableWorker: true,
  lowLatencyMode: false, // la latence importe peu pour de la TV ; la fluidité, oui
  backBufferLength: 60,
  maxBufferLength: 30, // ~30 s d'avance : encaisse les coupures courtes
  maxMaxBufferLength: 90,
  // Manifeste : détection rapide d'une source morte (pour basculer vite sur le
  // secours). Segments : nombreux ré-essais (stabilité d'un flux qui marche).
  manifestLoadingMaxRetry: 2,
  manifestLoadingRetryDelay: 500,
  levelLoadingMaxRetry: 3,
  levelLoadingRetryDelay: 1000,
  fragLoadingMaxRetry: 8,
  fragLoadingRetryDelay: 1000,
} as const;

export default function Player({ token }: { token: string }) {
  const [profile, setProfile] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [current, setCurrent] = useState<Channel | null>(null);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
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

  // (Re)charge le flux quand on change de chaîne, avec RÉCUPÉRATION AUTOMATIQUE :
  // une coupure réseau ou un à-coup de la source ne fige plus la chaîne — le
  // lecteur se reconnecte, récupère le décodeur, et se reconstruit en dernier
  // recours. Une chaîne dont la source revient reprend donc toute seule.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !current) return;
    // Sources à essayer : principale, puis secours si elle existe. En cas
    // d'échec répété, on BASCULE d'une source à l'autre → la chaîne ne reste
    // pas noire tant qu'une des deux fonctionne.
    const sources = current.backupUrl ? [current.url, current.backupUrl] : [current.url];
    let sourceIndex = 0;

    let hls: Hls | null = null;
    let stopped = false;
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveFatal = 0;
    const MAX_INLINE_RECOVERIES = 4; // au-delà, on reconstruit / on bascule

    // Passe à la source suivante (secours ↔ principale) après trop d'échecs.
    function switchSource() {
      if (sources.length > 1) {
        sourceIndex = (sourceIndex + 1) % sources.length;
        setPlayError(
          sourceIndex === 0 ? "Retour à la source principale…" : "Bascule sur la source de secours…",
        );
      } else {
        setPlayError("Flux instable — nouvelle tentative…");
      }
    }

    function start() {
      if (stopped || !video) return;
      const url = sources[sourceIndex];
      if (Hls.isSupported()) {
        hls = new Hls(HLS_CONFIG);
        hls.loadSource(url);
        hls.attachMedia(video);
        // Un segment lu = la chaîne est repartie : on remet le compteur à zéro.
        hls.on(Hls.Events.FRAG_BUFFERED, () => {
          consecutiveFatal = 0;
          setPlayError(null);
        });
        const hasBackup = sources.length > 1;
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return; // hls.js gère seul les erreurs non fatales
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !hasBackup && consecutiveFatal < MAX_INLINE_RECOVERIES) {
            // Pas de secours : on s'acharne sur l'unique source.
            consecutiveFatal++;
            setPlayError("Reconnexion au flux…");
            hls?.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && consecutiveFatal < MAX_INLINE_RECOVERIES) {
            // Erreur de décodage : réparable sur place (même source).
            consecutiveFatal++;
            setPlayError("Récupération du flux…");
            hls?.recoverMediaError();
          } else {
            // Source injoignable : on bascule (secours ↔ principale) et on
            // reconstruit vite s'il y a un secours, sinon on temporise.
            hls?.destroy();
            hls = null;
            consecutiveFatal = 0;
            switchSource();
            reloadTimer = setTimeout(start, hasBackup ? 1500 : 4000);
          }
        });
      } else {
        // Safari / iOS : HLS natif. On réessaie / bascule aussi en cas d'erreur.
        video.src = url;
        video.onerror = () => {
          if (stopped) return;
          switchSource();
          reloadTimer = setTimeout(() => {
            if (stopped || !video) return;
            video.src = sources[sourceIndex];
            video.load();
            video.play().catch(() => {});
          }, 4000);
        };
      }
      video.play().catch(() => {
        /* l'autoplay peut être bloqué : l'utilisateur cliquera sur lecture */
      });
    }

    start();

    return () => {
      stopped = true;
      if (reloadTimer) clearTimeout(reloadTimer);
      if (video) video.onerror = null;
      if (hls) hls.destroy();
    };
  }, [current]);

  function selectChannel(c: Channel) {
    setPlayError(null);
    setCurrent(c);
  }

  // Catégories présentes dans les chaînes du profil (avec leur nombre), pour
  // naviguer par thème/pays au lieu de faire défiler une longue liste à plat.
  const groups = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of channels) {
      const g = c.group ?? "";
      if (g) m.set(g, (m.get(g) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [channels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter(
      (c) =>
        (!group || (c.group ?? "") === group) &&
        (!q || c.name.toLowerCase().includes(q)),
    );
  }, [channels, search, group]);

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
        <div className="flex flex-col gap-2 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 Rechercher…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
          />
          {groups.length > 0 && (
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Toutes les catégories ({channels.length})</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name} ({g.count})
                </option>
              ))}
            </select>
          )}
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
