import { z } from "zod";

export const httpsImageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("/") ||
      (value.startsWith("https://") && z.string().url().safeParse(value).success),
    "Must be an HTTPS image URL or a local path starting with /",
  );

export const customScenarioSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(4000),
  location: z.string().trim().min(2).max(500),
  time: z.string().trim().min(2).max(500),
  userRole: z.string().trim().min(2).max(1000),
  relationship: z.string().trim().min(2).max(1000),
  goal: z.string().trim().min(2).max(2000),
  openingMessage: z.string().trim().min(10).max(6000),
});

export const createConversationSchema = z.object({
  characterId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  locale: z.enum(["vi", "en"]),
  userPreferredName: z.string().trim().max(80).optional(),
  preferredAddress: z.string().trim().max(200).optional(),
  customScenario: customScenarioSchema.optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

export const credentialSchema = z.object({
  provider: z.literal("google"),
  apiKey: z.string().trim().min(16).max(512),
});

export const createCharacterSchema = z.object({
  locale: z.enum(["vi", "en"]),
  name: z.string().trim().min(2).max(120),
  shortDescription: z.string().trim().min(10).max(280),
  description: z.string().trim().min(30).max(10000),
  biography: z.string().trim().min(30).max(10000),
  coverUrl: httpsImageUrl,
  avatarUrl: httpsImageUrl,
  galleryUrls: z.array(httpsImageUrl).max(12).default([]),
  rating: z.enum(["general", "sensitive", "adult"]),
  canon: z.string().trim().min(20).max(12000),
  personality: z.string().trim().min(20).max(6000),
  motivations: z.string().trim().min(5).max(4000),
  fears: z.string().trim().min(2).max(4000),
  likes: z.string().trim().min(2).max(4000),
  weaknesses: z.string().trim().min(2).max(4000),
  relationships: z.string().trim().min(2).max(6000),
  speechStyle: z.string().trim().min(10).max(4000),
  vocabulary: z.string().trim().min(2).max(4000),
  addressStyle: z.string().trim().min(2).max(2000),
  expressionHabits: z.string().trim().min(2).max(3000),
  knowledge: z.string().trim().min(2).max(6000),
  unknowns: z.string().trim().min(2).max(6000),
  boundaries: z.string().trim().min(2).max(4000),
  exampleDialogue: z.string().trim().min(10).max(6000),
  scenario: customScenarioSchema,
});
