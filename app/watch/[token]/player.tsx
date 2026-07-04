"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function Player({ memberId }: { memberId: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const storageKey = `restream-url-${memberId}`;

  const [input, setInput] = useState("");
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setInput(saved);
      setSrc(saved);
    }
  }, [storageKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const isHls = /\.m3u8(\?|$)/i.test(src);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError("Impossible de lire ce flux. Vérifie le lien.");
          hls.destroy();
          hlsRef.current = null;
        }
      });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    video.play().catch(() => {
      // Lecture automatique bloquée par le navigateur : l'utilisateur
      // lance la lecture via les contrôles.
    });

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src]);

  function watch(event: React.FormEvent) {
    event.preventDefault();
    const url = input.trim();
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      setError("Lien invalide : il doit commencer par http:// ou https://");
      return;
    }

    setError(null);
    localStorage.setItem(storageKey, url);
    setSrc(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={watch} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://exemple.com/flux.m3u8"
          className="h-12 flex-1 rounded-full border border-black/[.08] bg-white px-5 text-sm text-black outline-none focus:border-black/30 dark:border-white/[.145] dark:bg-[#111] dark:text-zinc-50 dark:focus:border-white/40"
        />
        <button
          type="submit"
          className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Regarder
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <video
        ref={videoRef}
        controls
        playsInline
        className={`aspect-video w-full rounded-xl bg-black ${src ? "" : "hidden"}`}
        onError={() => setError("Impossible de lire cette vidéo. Vérifie le lien.")}
      />
    </div>
  );
}
