import config from "../aio.config.json";

type FaqConfig = {
  q: string;
  a: string;
  jsonLd?: string;
};

export type FaqItem = {
  q: string;
  a: string;
  jsonLd: string;
};

export const aio = config;

function fill(s: string, count: number) {
  return s.replaceAll("{count}", String(count));
}

/** Q/R visibles (Citation Hooks). jsonLd reprend le texte déjà publié quand il existe. */
export function faqItems(count: number): FaqItem[] {
  const faq = config.i18n.fr.faq as FaqConfig[];
  return faq.map((item) => {
    const a = fill(item.a, count);
    const jsonLd = item.jsonLd ? fill(item.jsonLd, count) : a;
    if (!a.includes(jsonLd.slice(0, 60))) {
      throw new Error(`Citation Hook sans le texte FAQPage : ${item.q}`);
    }
    return { q: item.q, a, jsonLd };
  });
}

/** Sérialisation sûre pour <script type="application/ld+json"> (échappement de <). */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
