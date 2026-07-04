"use client";

import { useState } from "react";

type Member = {
  id: number;
  name: string;
  token: string;
};

type FamilyLink = Member & { url: string };

export default function LinksPanel({ members }: { members: Member[] }) {
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generateLinks() {
    const origin = window.location.origin;
    setLinks(
      members.map((member) => ({
        ...member,
        url: `${origin}/watch/${member.token}`,
      })),
    );
  }

  async function copyLink(link: FamilyLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Impossible de copier le lien");
    }
  }

  return (
    <>
      <button
        onClick={generateLinks}
        className="flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Générer les 15 liens
      </button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {links.length > 0 && (
        <ul className="flex w-full flex-col gap-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center gap-4 rounded-xl border border-black/[.08] bg-white px-4 py-3 dark:border-white/[.145] dark:bg-[#111]"
            >
              <span className="w-24 shrink-0 font-medium text-black dark:text-zinc-50">
                {link.name}
              </span>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
              >
                {link.url}
              </a>
              <button
                onClick={() => copyLink(link)}
                className="shrink-0 rounded-full border border-black/[.08] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                {copiedId === link.id ? "Copié !" : "Copier"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
