import { repo } from "./db/repo";
import type { Generation, Result, GenomeSnapshot, BusinessGenome } from "./db/types";

// Score de performance d'un résultat : la conversion pèse le plus.
export function scoreResult(r: Result): number {
  return (
    (r.conversions ?? 0) * 50 +
    (r.clicks ?? 0) * 5 +
    (r.likes ?? 0) * 1 +
    (r.views ?? 0) * 0.05
  );
}

// Recalcule le Business Genome à partir des générations + leurs résultats réels.
// Appelé après chaque nouveau Result. C'est la mémoire unifiée que tous les
// agents (Brief, Décisions, Coach) lisent — aucun agent ne travaille en isolé.
export async function recomputeGenome(businessId: string): Promise<BusinessGenome> {
  const gens = await repo.listGenerations(businessId);
  const results = await repo.listResults(businessId);

  const bestPerGen = new Map<string, number>();
  for (const r of results) {
    const s = scoreResult(r);
    bestPerGen.set(r.generationId, Math.max(bestPerGen.get(r.generationId) ?? 0, s));
  }

  const aggregate = (keyOf: (g: Generation) => string) => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const g of gens) {
      const score = bestPerGen.get(g.id);
      if (score == null) continue;
      const k = keyOf(g);
      const cur = m.get(k) ?? { sum: 0, n: 0 };
      cur.sum += score;
      cur.n += 1;
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([key, v]) => ({ key, avgScore: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => b.avgScore - a.avgScore);
  };

  const bestPlatforms = aggregate((g) => g.platform);
  const bestKinds = aggregate((g) => g.kind);
  const bestLocales = aggregate((g) => g.locale);

  const patterns: { label: string; evidence: number }[] = [];
  if (bestPlatforms[0]) patterns.push({ label: `${bestPlatforms[0].key} est ta meilleure plateforme`, evidence: bestPlatforms[0].n });
  if (bestKinds[0]) patterns.push({ label: `Le format « ${bestKinds[0].key} » surperforme`, evidence: bestKinds[0].n });
  if (bestLocales[0]) patterns.push({ label: `La langue « ${bestLocales[0].key} » convertit le mieux`, evidence: bestLocales[0].n });

  const snapshot: GenomeSnapshot = {
    bestPlatforms,
    bestKinds,
    bestLocales,
    patterns,
    totalResults: results.length,
  };

  return repo.saveGenome(businessId, snapshot, results.length);
}
