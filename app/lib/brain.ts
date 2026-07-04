import type { GenomeSnapshot, DecisionAction } from "./db/types";

// Seuil de confiance : en dessous, on refuse d'inventer des décisions (brief Ph.7).
export const DECISION_MIN_RESULTS = 5;

export type BriefContent = { angles: string[]; stop: string; opportunity: string };

// Brief du jour — ancré dans les résultats réels (Phase 3).
export function buildBrief(s: GenomeSnapshot): BriefContent {
  if (s.totalResults === 0) {
    return {
      angles: [
        "Publie 3 contenus aujourd'hui et saisis leurs résultats — sans données, pas de stratégie.",
        "Teste 2 plateformes différentes pour voir où ton audience réagit.",
        "Varie les formats (hooks, script, post) pour repérer ce qui accroche.",
      ],
      stop: "Arrête d'attendre la perfection : publie et mesure.",
      opportunity: "Chaque résultat saisi rend l'outil plus intelligent dès demain.",
    };
  }
  const p = s.bestPlatforms[0];
  const k = s.bestKinds[0];
  const l = s.bestLocales[0];
  const angles: string[] = [];
  if (k && p) angles.push(`Refais du « ${k.key} » sur ${p.key} — ton meilleur combo (${k.n} résultats).`);
  if (l) angles.push(`Pousse la langue « ${l.key} », celle qui convertit le mieux.`);
  if (p) angles.push(`Double la mise sur ${p.key} avant d'élargir ailleurs.`);
  while (angles.length < 3) angles.push("Reprends ton meilleur hook et décline-le sur une autre plateforme.");

  const worst = s.bestPlatforms[s.bestPlatforms.length - 1];
  return {
    angles: angles.slice(0, 3),
    stop: worst && s.bestPlatforms.length > 1 ? `Lève le pied sur ${worst.key} (sous-performe).` : "Arrête les formats sans résultat mesuré.",
    opportunity: l ? `Réplique ce qui marche en « ${l.key} » vers tes autres langues.` : "Teste une nouvelle langue.",
  };
}

export type DecisionContent = { actions: DecisionAction[]; stopDoing: string; basedOnData: string };

// Decision Engine — 3 actions max, justifiées par la donnée (Phase 7).
export function buildDecision(s: GenomeSnapshot, dataPoints: number): DecisionContent {
  if (dataPoints < DECISION_MIN_RESULTS) {
    return {
      actions: [
        {
          action: "Accumuler des données avant de décider.",
          justification: `Seulement ${dataPoints} résultat(s) — sous le seuil de confiance (${DECISION_MIN_RESULTS}). Toute décision serait du bruit.`,
          expected: "Une base fiable pour des décisions qui ne se trompent pas.",
          risk: "Aucun : c'est la prudence qui protège.",
        },
      ],
      stopDoing: "Arrête de tirer des conclusions sur trop peu de données.",
      basedOnData: `${dataPoints} résultat(s) — insuffisant.`,
    };
  }
  const p = s.bestPlatforms[0];
  const k = s.bestKinds[0];
  const l = s.bestLocales[0];
  const actions: DecisionAction[] = [];
  if (p) actions.push({ action: `Concentre ~70 % de tes efforts sur ${p.key}.`, justification: `Score moyen ${p.avgScore} sur ${p.n} contenus.`, expected: "Meilleur rendement par contenu.", risk: "Moins de diversification — réévalue dans 2 semaines." });
  if (k) actions.push({ action: `Produis surtout du « ${k.key} ».`, justification: `Format le plus performant (${k.n} résultats).`, expected: "Engagement supérieur.", risk: "Lassitude possible — varie les angles." });
  if (l) actions.push({ action: `Priorise la langue « ${l.key} ».`, justification: `Convertit le mieux (${l.n} résultats).`, expected: "Conversion accrue.", risk: "Couverture moindre des autres marchés." });
  while (actions.length < 3) actions.push({ action: "Réinvestis sur ton meilleur contenu passé.", justification: "Les gagnants se répliquent.", expected: "Résultats reproductibles.", risk: "Faible." });

  const worst = s.bestPlatforms[s.bestPlatforms.length - 1];
  return {
    actions: actions.slice(0, 3),
    stopDoing: worst && s.bestPlatforms.length > 1 ? `Arrête de pousser ${worst.key} tant que ça ne décolle pas.` : "Arrête les paris non mesurés.",
    basedOnData: `${dataPoints} résultats agrégés dans le Genome.`,
  };
}

// Résumé du Genome injecté dans le Coach (Phase 5) — il parle chiffres, pas généralités.
export function genomeBriefing(s: GenomeSnapshot): string {
  if (s.totalResults === 0) return "Aucune donnée de résultat pour l'instant.";
  const fmt = (arr: { key: string; avgScore: number; n: number }[]) =>
    arr.slice(0, 3).map((x) => `${x.key} (score ${x.avgScore}, n=${x.n})`).join(", ");
  return [
    `Résultats totaux : ${s.totalResults}.`,
    `Meilleures plateformes : ${fmt(s.bestPlatforms)}.`,
    `Meilleurs formats : ${fmt(s.bestKinds)}.`,
    `Meilleures langues : ${fmt(s.bestLocales)}.`,
  ].join(" ");
}
