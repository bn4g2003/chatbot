import { GoogleGenAI } from "@google/genai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { apiCredentials } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const testSchema = z.object({
  apiKey: z.string().optional(),
  provider: z.literal("google").default("google"),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const input = testSchema.parse(body);

    let keyToTest = input.apiKey?.trim();

    // If no key provided in body, test the stored system key
    if (!keyToTest) {
      const stored = await db.query.apiCredentials.findFirst({
        where: and(
          eq(apiCredentials.ownerType, "system"),
          eq(apiCredentials.provider, "google")
        ),
      });

      if (!stored) {
        return Response.json(
          { ok: false, error: "No system Gemini API key configured yet." },
          { status: 400 }
        );
      }

      keyToTest = decryptSecret(stored.encryptedKey);
    }

    if (!keyToTest) {
      return Response.json(
        { ok: false, error: "API key is missing or empty." },
        { status: 400 }
      );
    }

    // Call Google Gemini API to test connection
    const client = new GoogleGenAI({ apiKey: keyToTest });
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Respond with the single word: OK" }] }],
    });

    if (response.text) {
      // If we tested stored key, update lastValidatedAt
      await db
        .update(apiCredentials)
        .set({ lastValidatedAt: new Date() })
        .where(
          and(
            eq(apiCredentials.ownerType, "system"),
            eq(apiCredentials.provider, "google")
          )
        );

      return Response.json({
        ok: true,
        message: "Google Gemini API connection successful!",
        reply: response.text.trim(),
        validatedAt: new Date(),
      });
    }

    return Response.json(
      { ok: false, error: "Model returned empty response" },
      { status: 502 }
    );
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        error: e.message || "Failed to validate Gemini API key",
      },
      { status: 400 }
    );
  }
}
