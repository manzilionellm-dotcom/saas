import type { LLMProvider, LLMRequest, LLMResponse } from "./provider";
import { ClaudeProvider } from "./claude";
import { LocalProvider } from "./local";
import { repo } from "../db/repo";

// Sélection du provider actif : Claude si une clé est présente, sinon repli local.
// La logique métier appelle TOUJOURS runLLM(), jamais un provider en direct.
export function getProvider(): LLMProvider {
  return process.env.ANTHROPIC_API_KEY ? new ClaudeProvider() : new LocalProvider();
}

export function usingRealLLM(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Exécute un appel LLM ET enregistre un log structuré (exigence évolutive n°8).
export async function runLLM(req: LLMRequest): Promise<LLMResponse> {
  const provider = getProvider();
  try {
    const res = await provider.complete(req);
    await repo.addLLMLog({
      provider: res.provider,
      input: truncate((req.system ? req.system + "\n---\n" : "") + req.prompt),
      output: truncate(res.text),
      tokensUsed: res.tokensUsed,
      latencyMs: res.latencyMs,
    });
    return res;
  } catch (err) {
    await repo.addLLMLog({
      provider: provider.name,
      input: truncate((req.system ? req.system + "\n---\n" : "") + req.prompt),
      error: err instanceof Error ? err.message : "erreur inconnue",
    });
    throw err;
  }
}

function truncate(s: string, max = 4000): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export type { LLMRequest, LLMResponse };
