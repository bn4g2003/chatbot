import type { AiModel } from "./types";

// Model IDs are data. Add future models here and register new provider adapters in createAiClient.
export const aiModels = [
  {
    id: "gemini-2.5-flash",
    provider: "google",
    label: "Gemini 2.5 Flash",
    description: "Model mặc định: tốc độ cao, nhập vai mượt mà và thông minh.",
  },
  {
    id: "gemini-3.5-flash-lite",
    provider: "google",
    label: "Gemini 3.5 Flash Lite",
    description: "Siêu nhanh và tiết kiệm token tối đa cho các lượt thoại nhanh.",
  },
  {
    id: "gemini-2.5-pro",
    provider: "google",
    label: "Gemini 2.5 Pro",
    description: "Mô hình cao cấp: tư duy sâu, miêu tả văn phong phức tạp và bối cảnh lớn.",
  },
] as const satisfies readonly AiModel[];

export function getAiModel(modelId: string): AiModel | undefined {
  return aiModels.find((model) => model.id === modelId);
}
