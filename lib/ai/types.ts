export type AiProviderId = "google";
export type AiModel = { id: string; provider: AiProviderId; label: string; description: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type GenerateTextInput = {
  messages: ChatMessage[];
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
};
export interface AiClient { generateText(input: GenerateTextInput): Promise<string> }
export interface StreamingAiClient extends AiClient { streamText(input: GenerateTextInput): AsyncGenerator<string> }
