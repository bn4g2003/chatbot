import "server-only";
import { getAiModel } from "./models";
import { createGoogleClient } from "./providers/google";
import type { StreamingAiClient } from "./types";

export function createAiClient(input: { modelId: string; apiKey: string }): StreamingAiClient {
  const model = getAiModel(input.modelId);
  if (!model) throw new Error(`Unsupported AI model: ${input.modelId}`);
  if (!input.apiKey.trim()) throw new Error("An API key is required");
  switch (model.provider) {
    case "google": return createGoogleClient(input.apiKey, model.id);
  }
}

export { aiModels } from "./models";
export type { AiClient, StreamingAiClient, ChatMessage, GenerateTextInput } from "./types";
