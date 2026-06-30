import type { LLMProvider, LLMRequest, LLMResponse } from "./provider";
import { approxTokens } from "../cost";

// Provider de repli : fonctionne SANS clé API (déterministe). Permet de faire
// tourner toute l'app et de tester la chaîne avant de brancher Claude.
export class LocalProvider implements LLMProvider {
  readonly name = "local";
  readonly model = "local";

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const locale = req.locale ?? "fr";
    const text =
      `【Mode local — sans IA réelle】\n` +
      `Locale : ${locale}\n` +
      `Réponse simulée à la demande :\n"${req.prompt.slice(0, 280)}"\n\n` +
      `Branche une clé ANTHROPIC_API_KEY pour des réponses Claude réelles.`;

    const inputTokens = approxTokens((req.system ?? "") + req.prompt);
    const outputTokens = approxTokens(text);

    return {
      text,
      model: this.model,
      provider: this.name,
      inputTokens,
      outputTokens,
      tokensUsed: inputTokens + outputTokens,
      costEstimate: 0,
      latencyMs: Date.now() - start,
    };
  }
}
