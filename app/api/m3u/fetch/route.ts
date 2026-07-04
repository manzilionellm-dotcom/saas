import { NextResponse } from "next/server";

// Télécharge une playlist M3U depuis une URL (ex. un lien get.php d'abonnement).
// Fait côté serveur pour contourner le blocage navigateur "contenu mixte"
// (page https -> lien http) et l'absence de CORS sur ces endpoints.
// À utiliser uniquement avec un abonnement que vous possédez.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let url: string;
  try {
    const body = await request.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "L'URL doit commencer par http:// ou https://" },
      { status: 400 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Beaucoup de panneaux IPTV exigent un User-Agent de lecteur.
        "User-Agent": "VLC/3.0.20 LibVLC/3.0.20",
        Accept: "*/*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Le serveur a répondu ${res.status}. Vérifiez l'URL, l'abonnement ou son expiration.` },
        { status: 502 },
      );
    }

    const content = await res.text();

    if (!content.toUpperCase().includes("#EXTM3U")) {
      const preview = content.slice(0, 120).replace(/\s+/g, " ").trim();
      return NextResponse.json(
        {
          error:
            "L'URL a répondu mais le contenu n'est pas une playlist M3U" +
            (preview ? ` (reçu : « ${preview}… »).` : ".") +
            " Souvent : identifiants expirés, connexions max atteintes, ou mauvais type de lien.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ content });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "Délai dépassé : le serveur de la playlist n'a pas répondu à temps."
          : "Impossible de joindre le serveur de la playlist (URL injoignable ou hors ligne).",
      },
      { status: 502 },
    );
  }
}
