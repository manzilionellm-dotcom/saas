#!/usr/bin/env node
// Génère public/llms.txt depuis aio.config.json (source unique). Usage: node scripts/aio-llms.mjs
import fs from "node:fs";

const c = JSON.parse(fs.readFileSync(new URL("../aio.config.json", import.meta.url), "utf8"));
const L = c.defaultLang;
const i = c.i18n[L];
if (!i) {
  console.error("Langue absente dans aio.config.json : " + L);
  process.exit(1);
}

const fill = (s) =>
  String(s)
    .replaceAll("{count}", String(c.toolCount))
    .replaceAll("{categories}", String(c.categoryCount))
    .replaceAll("{siteUrl}", String(c.siteUrl));

const eur = (n) => (n === 0 ? "0 €" : `${n} €`);
const na = "non indiqué";
const show = (v) => {
  if (v === null || v === undefined || v === "") return na;
  if (Array.isArray(v)) return v.length ? v.join(", ") : na;
  return String(v);
};

const wc = (s) => [
  (s.match(/\S+/g) || []).length,
  (s.match(/[\p{L}\p{N}€$%]+(?:['’][\p{L}]+)?/gu) || []).length,
];

const lines = [];
lines.push(`# ${c.siteName}`, "", `> ${fill(i.description)}`, "");
lines.push("## Services", "");
if (i.servicesIntro) lines.push(fill(i.servicesIntro), "");
for (const p of c.plans) {
  const soon = p.comingSoon ? " Badge Bientôt, fiche non cliquable." : "";
  lines.push(`- ${p.name[L]} (${p.category}) : ${eur(p.price)} / ${p.billing}.${soon} ${p.summary[L]}`);
}
lines.push("", "## Prix", "");
for (const p of c.plans) {
  lines.push(`- ${p.name[L]} : ${eur(p.price)} / ${p.billing}`);
}
lines.push("", "## Caractéristiques techniques", "");
const t = c.tech || {};
lines.push(`- Résolution maximale : ${show(t.maxResolution)}`);
lines.push(`- Appareils : ${show(t.devices)}`);
lines.push(`- Délai d'activation : ${show(t.activationMinutes)}`);
lines.push(`- Débits / bande passante minimale : ${show(t.bitrate)}`);
lines.push(`- Nombre de chaînes : ${show(t.channelCount)}`);
for (const note of t.published || []) lines.push(`- ${note}`);
lines.push("");

const faq = (i.faq || []).slice(0, 10);
lines.push(`## Questions fréquentes (${faq.length})`, "");
for (const f of faq) {
  const a = fill(f.a);
  const [w1, w2] = wc(a);
  if (w1 < 40 || w1 > 60 || w2 < 40 || w2 > 60) {
    console.error(`Q/R hors 40–60 mots (${w1}/${w2}) : ${f.q}`);
    process.exit(1);
  }
  lines.push(`### ${f.q}`, "", a, "");
}

fs.mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
fs.writeFileSync(new URL("../public/llms.txt", import.meta.url), lines.join("\n").trimEnd() + "\n");
console.log("public/llms.txt écrit (" + faq.length + " Q/R)");
