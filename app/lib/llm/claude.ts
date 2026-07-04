import type { LLMProvider, LLMRequest, LLMResponse } from "./provider";
import { estimateCost, approxTokens } from "../cost";
import { createUpstreamClient, withEgressSession } from "../egress";

// Implémentation Claude de l'interface LLMProvider.
export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  readonly model = "claude-sonnet-4-6";

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    // Tout appel amont transite par la passerelle de sortie : circuit breaker,
    // limite de sessions concurrentes et isolation réseau (proxy).
    const message = await withEgressSession(() =>
      createUpstreamClient().messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 1024,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
      }),
    );
    const latencyMs = Date.now() - start;

    const text = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const inputTokens = message.usage?.input_tokens ?? approxTokens((req.system ?? "") + req.prompt);
    const outputTokens = message.usage?.output_tokens ?? approxTokens(text);

    return {
      text,
      model: this.model,
      provider: this.name,
      inputTokens,
      outputTokens,
      tokensUsed: inputTokens + outputTokens,
      costEstimate: estimateCost(this.model, inputTokens, outputTokens),
      latencyMs,
    };
  }
}
