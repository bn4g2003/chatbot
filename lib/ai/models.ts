import type { AiModel } from "./types";

// Model IDs are data. Add future models here and register new provider adapters in createAiClient.
export const aiModels = [{
  id: "gemini-3.5-flash-lite",
  provider: "google",
  label: "Gemini 3.5 Flash Lite",
  description: "Fast, economical default model for character chat.",
}] as const satisfies readonly AiModel[];

export function getAiModel(modelId: string): AiModel | undefined {
  return aiModels.find((model) => model.id === modelId);
}
