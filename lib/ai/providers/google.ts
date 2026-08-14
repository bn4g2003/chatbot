import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, GenerateTextInput, StreamingAiClient } from "../types";

function toGoogleContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export function createGoogleClient(apiKey: string, modelId: string): StreamingAiClient {
  const client = new GoogleGenAI({ apiKey });
  return {
    async generateText(input: GenerateTextInput) {
      const response = await client.models.generateContent({
        model: modelId,
        contents: toGoogleContents(input.messages),
        config: { systemInstruction: input.system },
      });
      if (!response.text) throw new Error("The AI model returned an empty response");
      return response.text;
    },
    async *streamText(input: GenerateTextInput) {
      const stream = await client.models.generateContentStream({ model: modelId, contents: toGoogleContents(input.messages), config: { systemInstruction: input.system } });
      for await (const chunk of stream) if (chunk.text) yield chunk.text;
    },
  };
}
