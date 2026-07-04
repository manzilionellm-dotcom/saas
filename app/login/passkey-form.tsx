"use client";

import { useState } from "react";
import { signIn } from "next-auth/webauthn";

type Busy = "idle" | "register" | "authenticate";

export function PasskeyForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<Busy>("idle");
  const [error, setError] = useState<string | null>(null);

  async function register() {
    setError(null);
    if (!email) {
      setError("Renseigne un email pour créer ton compte.");
      return;
    }
    setBusy("register");
    try {
      await signIn("passkey", {
        action: "register",
        email,
        name: name || email,
        callbackUrl: "/",
      });
    } catch {
      setError("Échec de la création du passkey.");
      setBusy("idle");
    }
  }

  async function authenticate() {
    setError(null);
    setBusy("authenticate");
    try {
      await signIn("passkey", { callbackUrl: "/" });
    } catch {
      setError("Échec de la connexion par empreinte.");
      setBusy("idle");
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <button
        type="button"
        onClick={authenticate}
        disabled={busy !== "idle"}
        className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {busy === "authenticate"
          ? "Vérification…"
          : "Se connecter par empreinte"}
      </button>

      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
        nouveau compte
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="username webauthn"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 rounded-lg border border-black/10 bg-transparent px-4 outline-none focus:border-foreground dark:border-white/15"
        />
        <input
          type="text"
          autoComplete="name"
          placeholder="Nom (optionnel)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-lg border border-black/10 bg-transparent px-4 outline-none focus:border-foreground dark:border-white/15"
        />
        <button
          type="button"
          onClick={register}
          disabled={busy !== "idle"}
          className="flex h-12 items-center justify-center rounded-full border border-solid border-black/10 px-5 transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[.06]"
        >
          {busy === "register" ? "Création…" : "Créer un passkey"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
