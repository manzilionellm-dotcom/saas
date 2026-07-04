import { streamsStore } from "../../../../lib/db/streams-store";
import { isPanelAuthed, unauthorized } from "../../../../lib/panel-auth";
import { runLLM, usingRealLLM } from "../../../../lib/llm";

export const dynamic = "force-dynamic";

// Catégories propres et cohérentes proposées à l'IA (liste fermée = résultat
// homogène, directement utilisable par les filtres et les catégories).
const CATEGORIES = [
  "Sport",
  "Cinéma",
  "Séries",
  "Enfants",
  "Actualités",
  "Musique",
  "Documentaire",
  "Animaux",
  "Divertissement",
  "Culture",
  "Religion",
  "Adultes",
  "Autre",
];
const CATSET = new Set(CATEGORIES);
const BATCH_MAX = 60;

// Extrait un tableau JSON de la réponse (tolère un éventuel ```json … ```).
function parseJsonArray(text: string): { i: number; cat: string }[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("réponse IA inattendue");
  return JSON.parse(text.slice(start, end + 1));
}

// POST /api/panel/ai/categorize  { onlyUngrouped?: boolean, limit?: number }
// Range un LOT de chaînes (par défaut celles sans catégorie) : l'IA attribue à
// chacune une catégorie de la liste ci-dessus. Le panel rappelle en boucle
// jusqu'à épuisement, ce qui maîtrise le coût et montre la progression.
export async function POST(request: Request) {
  if (!(await isPanelAuthed())) return unauthorized();
  if (!usingRealLLM()) {
    return Response.json(
      { error: "IA indisponible : configurez ANTHROPIC_API_KEY sur le serveur." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* corps optionnel */
  }
  const onlyUngrouped = body.onlyUngrouped !== false; // défaut : seulement les non rangées
  const limit = Math.min(Math.max(Number(body.limit ?? 40) || 40, 1), BATCH_MAX);

  const all = await streamsStore.list();
  const candidates = onlyUngrouped ? all.filter((c) => !c.group) : all;
  if (candidates.length === 0) {
    return Response.json({ done: true, processed: 0, remaining: 0 });
  }
  const batch = candidates.slice(0, limit);

  const system =
    "Tu ranges des chaînes de TV par catégorie, d'après leur nom. " +
    `Catégories autorisées, à utiliser EXACTEMENT telles quelles : ${CATEGORIES.join(", ")}. ` +
    "Choisis la plus pertinente ; en cas de doute, « Autre ». " +
    'Réponds UNIQUEMENT par un tableau JSON de la forme [{"i":0,"cat":"Sport"}, …], une entrée par chaîne, sans aucun texte autour.';
  const prompt =
    "Chaînes à classer :\n" + batch.map((c, i) => `${i}. ${c.name}`).join("\n");

  let parsed: { i: number; cat: string }[];
  let cost = 0;
  let model = "";
  try {
    const res = await runLLM({ system, prompt, maxTokens: 1800 });
    cost = res.costEstimate;
    model = res.model;
    parsed = parseJsonArray(res.text);
  } catch (err) {
    return Response.json(
      { error: `Rangement IA impossible : ${err instanceof Error ? err.message : "erreur"}` },
      { status: 502 },
    );
  }

  // Catégorie retournée par l'IA, indexée. Toute chaîne du lot non couverte (ou
  // catégorie hors liste) reçoit « Autre » → chaque chaîne du lot est traitée,
  // ce qui garantit la progression (pas de boucle infinie).
  const byIndex = new Map<number, string>();
  for (const e of parsed) {
    if (typeof e?.i === "number" && CATSET.has(e.cat)) byIndex.set(e.i, e.cat);
  }
  const updates = batch.map((c, i) => ({ id: c.id, group: byIndex.get(i) ?? "Autre" }));
  const processed = await streamsStore.setChannelGroups(updates);

  const remaining = Math.max(0, candidates.length - batch.length);
  return Response.json({
    processed,
    remaining,
    done: remaining === 0,
    cost,
    model,
  });
}
