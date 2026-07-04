import Anthropic from "@anthropic-ai/sdk";
import type { AuditResult } from "./seo-audit";

// Vrai ? seulement si une clé API Claude est présente dans l'environnement.
export function hasClaude(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Versailles rédige les corrections concrètes à partir d'un audit.
export async function writeFixes(audit: AuditResult): Promise<string> {
  const client = new Anthropic(); // lit ANTHROPIC_API_KEY depuis l'environnement

  const problems = audit.checks
    .filter((c) => c.status !== "pass")
    .map((c) => `- [${c.area}] ${c.label} (${c.status}) : ${c.detail}`)
    .join("\n");

  const prompt = `Tu es Versailles, un expert SEO, AEO et GEO. Voici l'audit de la page ${audit.finalUrl} (score ${audit.score}/100).

Problèmes détectés :
${problems || "(aucun problème majeur, propose des optimisations avancées)"}

Pour chaque point, rédige la correction concrète et prête à coller : balises HTML, meta tags, JSON-LD ou texte rédigé. Sois précis et actionnable. Réponds en français, en markdown, sans préambule.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}
