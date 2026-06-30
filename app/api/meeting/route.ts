import { runMeeting, meetingSummary } from "../../lib/advisors";

// POST /api/meeting  { question: string }  ->  { comments, summary }
//
// Aujourd'hui : génération locale déterministe (aucune clé requise).
// Pour brancher la vraie IA Claude : ajouter une clé ANTHROPIC_API_KEY et,
// ici, appeler l'API Claude pour générer chaque commentaire à partir du rôle
// du conseiller + de la question, puis renvoyer le même format.
export async function POST(request: Request) {
  let question = "";
  try {
    const body = await request.json();
    question = typeof body?.question === "string" ? body.question : "";
  } catch {
    return Response.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  if (!question.trim()) {
    return Response.json({ error: "Question vide." }, { status: 400 });
  }

  const comments = runMeeting(question);
  const summary = meetingSummary(question);

  return Response.json({ question, comments, summary });
}
