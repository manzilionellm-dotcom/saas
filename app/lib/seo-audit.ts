// Analyseur d'URL réel : télécharge une page et l'audite pour le SEO et l'AEO/GEO.
// Aucune dépendance externe — extraction par expressions régulières ciblées.

export type CheckStatus = "pass" | "warn" | "fail";

export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  area: "SEO" | "AEO/GEO" | "Technique";
};

export type AuditResult = {
  url: string;
  finalUrl: string;
  httpStatus: number;
  fetchedAt: string;
  score: number; // 0-100
  checks: Check[];
};

const TIMEOUT_MS = 12000;

// --- Helpers d'extraction ---------------------------------------------------

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function getMeta(html: string, attr: string, value: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const c = tag.match(/content=["']([^"']*)["']/i);
  return c ? c[1].trim() : null;
}

function countTag(html: string, tag: string): number {
  const re = new RegExp(`<${tag}[\\s>]`, "gi");
  return (html.match(re) || []).length;
}

function getJsonLdTypes(html: string): string[] {
  const types: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      collectTypes(data, types);
    } catch {
      // JSON-LD invalide : ignoré
    }
  }
  return types;
}

function collectTypes(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out));
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const t = obj["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.push(x));
    Object.values(obj).forEach((v) => collectTypes(v, out));
  }
}

function wordCount(html: string): number {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

// --- Audit ------------------------------------------------------------------

const WEIGHTS: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

function buildChecks(html: string): Check[] {
  const checks: Check[] = [];

  // Titre
  const title = getTitle(html);
  if (!title) {
    checks.push({ id: "title", label: "Balise <title>", status: "fail", area: "SEO", detail: "Aucun titre trouvé. C'est le signal SEO le plus important." });
  } else {
    const len = title.length;
    const ok = len >= 10 && len <= 60;
    checks.push({ id: "title", label: "Balise <title>", status: ok ? "pass" : "warn", area: "SEO", detail: `« ${title} » (${len} caractères). ${ok ? "Bonne longueur." : "Visez 10–60 caractères."}` });
  }

  // Meta description
  const desc = getMeta(html, "name", "description");
  if (!desc) {
    checks.push({ id: "description", label: "Meta description", status: "fail", area: "SEO", detail: "Absente. Ajoutez un résumé de 50–160 caractères." });
  } else {
    const len = desc.length;
    const ok = len >= 50 && len <= 160;
    checks.push({ id: "description", label: "Meta description", status: ok ? "pass" : "warn", area: "SEO", detail: `${len} caractères. ${ok ? "Bonne longueur." : "Visez 50–160 caractères."}` });
  }

  // H1
  const h1 = countTag(html, "h1");
  checks.push({
    id: "h1",
    label: "Titre H1",
    status: h1 === 1 ? "pass" : "fail",
    area: "SEO",
    detail: h1 === 0 ? "Aucun H1. Ajoutez un titre principal unique." : h1 === 1 ? "Un seul H1, parfait." : `${h1} H1 trouvés. Gardez-en un seul.`,
  });

  // Structure H2
  const h2 = countTag(html, "h2");
  checks.push({ id: "h2", label: "Sous-titres H2", status: h2 >= 1 ? "pass" : "warn", area: "SEO", detail: h2 >= 1 ? `${h2} sous-titres : bonne structure.` : "Aucun H2. Structurez le contenu en sections." });

  // Open Graph
  const og = getMeta(html, "property", "og:title") && getMeta(html, "property", "og:image");
  checks.push({ id: "og", label: "Open Graph (partage social)", status: og ? "pass" : "warn", area: "SEO", detail: og ? "og:title et og:image présents." : "Ajoutez og:title, og:description et og:image pour de beaux partages." });

  // Données structurées (clé pour AEO/GEO)
  const types = getJsonLdTypes(html);
  checks.push({
    id: "jsonld",
    label: "Données structurées (JSON-LD)",
    status: types.length > 0 ? "pass" : "fail",
    area: "AEO/GEO",
    detail: types.length > 0 ? `Schémas détectés : ${[...new Set(types)].join(", ")}. Les IA s'appuient dessus pour vous citer.` : "Aucune donnée structurée. C'est essentiel pour être cité par les moteurs de réponse (AEO/GEO).",
  });

  // FAQ / Q&A (adoré des moteurs de réponse)
  const hasFaq = types.some((t) => /FAQPage|QAPage|Question/i.test(t));
  checks.push({ id: "faq", label: "Format questions / réponses", status: hasFaq ? "pass" : "warn", area: "AEO/GEO", detail: hasFaq ? "Schéma FAQ/Q&A présent : idéal pour les moteurs de réponse." : "Ajoutez une section FAQ avec un schéma FAQPage : les IA adorent citer des Q/R." });

  // Contenu substantiel
  const words = wordCount(html);
  checks.push({ id: "content", label: "Volume de contenu", status: words >= 300 ? "pass" : words >= 100 ? "warn" : "fail", area: "AEO/GEO", detail: `${words} mots. ${words >= 300 ? "Contenu suffisant pour être cité." : "Étoffez : un contenu substantiel est mieux référencé et cité."}` });

  // Technique : lang
  const hasLang = /<html[^>]+lang=["'][^"']+["']/i.test(html);
  checks.push({ id: "lang", label: "Attribut lang", status: hasLang ? "pass" : "warn", area: "Technique", detail: hasLang ? "Langue déclarée sur <html>." : "Ajoutez lang=\"fr\" (ou autre) sur la balise <html>." });

  // Technique : viewport (mobile)
  const hasViewport = !!getMeta(html, "name", "viewport");
  checks.push({ id: "viewport", label: "Mobile (viewport)", status: hasViewport ? "pass" : "fail", area: "Technique", detail: hasViewport ? "Balise viewport présente." : "Ajoutez <meta name=\"viewport\"> pour le mobile." });

  // Technique : canonical
  const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
  checks.push({ id: "canonical", label: "URL canonique", status: hasCanonical ? "pass" : "warn", area: "Technique", detail: hasCanonical ? "Canonical présent." : "Ajoutez un <link rel=\"canonical\"> pour éviter le contenu dupliqué." });

  // Technique : noindex ?
  const robots = getMeta(html, "name", "robots") || "";
  const noindex = /noindex/i.test(robots);
  checks.push({ id: "robots", label: "Indexation autorisée", status: noindex ? "fail" : "pass", area: "Technique", detail: noindex ? "⚠️ La page est en noindex : invisible pour les moteurs !" : "La page peut être indexée." });

  // Images : attribut alt
  const imgs = countTag(html, "img");
  if (imgs > 0) {
    const withAlt = (html.match(/<img[^>]+alt=["'][^"']*["'][^>]*>/gi) || []).length;
    const ratio = withAlt / imgs;
    checks.push({ id: "alt", label: "Textes alternatifs des images", status: ratio >= 0.9 ? "pass" : ratio >= 0.5 ? "warn" : "fail", area: "SEO", detail: `${withAlt}/${imgs} images avec attribut alt.` });
  }

  return checks;
}

function scoreOf(checks: Check[]): number {
  if (checks.length === 0) return 0;
  const total = checks.reduce((s, c) => s + WEIGHTS[c.status], 0);
  return Math.round((total / checks.length) * 100);
}

export async function auditUrl(rawUrl: string): Promise<AuditResult> {
  const url = new URL(rawUrl); // lève une erreur si invalide
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "VersaillesBot/1.0 (+SEO/AEO audit)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await res.text();
    const checks = buildChecks(html);
    return {
      url: rawUrl,
      finalUrl: res.url || url.toString(),
      httpStatus: res.status,
      fetchedAt: new Date().toISOString(),
      score: scoreOf(checks),
      checks,
    };
  } finally {
    clearTimeout(timer);
  }
}
