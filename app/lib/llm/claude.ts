import Anthropic from "@anthropic-ai/sdk";
import { socksDispatcher } from "fetch-socks";
import type { LLMProvider, LLMRequest, LLMResponse } from "./provider";
import { estimateCost, approxTokens } from "../cost";

/**
 * Options du client Anthropic. Si `EGRESS_PROXY_ENDPOINT` est défini
 * (ex. "socks5://mon-proxy:1080"), tout le trafic sortant vers l'API amont
 * est routé via ce proxy SOCKS. Vide = connexion directe (comportement par
 * défaut). L'adresse n'est donc jamais figée dans le code.
 */
function buildAnthropicOptions(): ConstructorParameters<typeof Anthropic>[0] {
  const endpoint = process.env.EGRESS_PROXY_ENDPOINT?.trim();
  if (!endpoint) return {};

  const url = new URL(endpoint);
  const dispatcher = socksDispatcher({
    type: url.protocol === "socks4:" ? 4 : 5,
    host: url.hostname,
    port: Number(url.port) || 1080,
    userId: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  });

  // `dispatcher` est une extension undici absente du type RequestInit standard.
  return { fetchOptions: { dispatcher } } as ConstructorParameters<typeof Anthropic>[0];
}

// Implémentation Claude de l'interface LLMProvider.
export class ClaudeProvider implements LLMProvider {
  readonly name = "claude";
  readonly model = "claude-sonnet-4-6";
  private client = new Anthropic(buildAnthropicOptions()); // lit ANTHROPIC_API_KEY

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    });
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
