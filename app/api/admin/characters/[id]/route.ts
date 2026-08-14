import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { characterImages, characterPersonas, characterReviews, characters, characterTranslations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const patchCharacterSchema = z.object({
  status: z
    .enum(["draft", "pending_review", "published", "rejected", "archived"])
    .optional(),
  featured: z.boolean().optional(),
  rating: z.enum(["general", "sensitive", "adult"]).optional(),
  reviewNote: z.string().max(500).optional(),
});

const editorSchema = z.object({
  slug: z.string().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  originalLocale: z.enum(["vi", "en"]),
  status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]),
  rating: z.enum(["general", "sensitive", "adult"]),
  featured: z.boolean(),
  translation: z.object({
    locale: z.enum(["vi", "en"]), name: z.string().min(1).max(120),
    shortDescription: z.string().min(1).max(300), description: z.string().min(1).max(5000), biography: z.string().min(1).max(10000),
  }),
  persona: z.object({
    canon: z.string().min(1), personality: z.string().min(1), motivations: z.string(), fears: z.string(), likes: z.string(), weaknesses: z.string(),
    relationships: z.string(), speechStyle: z.string().min(1), vocabulary: z.string(), addressStyle: z.string(), expressionHabits: z.string(),
    knowledge: z.string(), unknowns: z.string(), boundaries: z.string(), exampleDialogue: z.string(),
  }),
  images: z.array(z.object({ url: z.string().url().startsWith("https://").max(2048), type: z.enum(["avatar", "cover", "gallery"]), altText: z.string().max(200).optional() })).max(20),
});

export async function GET(_request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await route.params;
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, id),
      with: { translations: true, persona: true, images: { orderBy: (image, { asc }) => [asc(image.sortOrder)] }, scenarios: { with: { translations: true } } },
    });
    if (!character) return Response.json({ error: "Character not found" }, { status: 404 });
    return Response.json({ character });
  } catch (e: any) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
    console.error("Failed to load admin character detail", { characterId: (await route.params).id, message });
    return Response.json({ error: status === 500 ? "Failed to load character detail" : message }, { status });
  }
}

export async function PUT(request: Request, route: { params: Promise<{ id: string }> }) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await route.params;
    const input = editorSchema.parse(await request.json());
    await db.transaction(async (tx) => {
      await tx.update(characters).set({ slug: input.slug, originalLocale: input.originalLocale, status: input.status, rating: input.rating, featured: input.featured, updatedAt: new Date() }).where(eq(characters.id, id));
      const existingTranslation = await tx.query.characterTranslations.findFirst({ where: eq(characterTranslations.characterId, id) });
      if (existingTranslation) await tx.update(characterTranslations).set({ ...input.translation, updatedAt: new Date() }).where(eq(characterTranslations.id, existingTranslation.id));
      else await tx.insert(characterTranslations).values({ characterId: id, ...input.translation });
      const existingPersona = await tx.query.characterPersonas.findFirst({ where: eq(characterPersonas.characterId, id) });
      if (existingPersona) await tx.update(characterPersonas).set({ ...input.persona, promptVersion: existingPersona.promptVersion + 1, updatedAt: new Date() }).where(eq(characterPersonas.id, existingPersona.id));
      else await tx.insert(characterPersonas).values({ characterId: id, ...input.persona });
      await tx.delete(characterImages).where(eq(characterImages.characterId, id));
      if (input.images.length) await tx.insert(characterImages).values(input.images.map((image, index) => ({ characterId: id, ...image, sortOrder: index })));
      await tx.insert(characterReviews).values({ characterId: id, reviewerId: adminSession.user.id, decision: "edited", note: "Character content updated by administrator" });
    });
    return Response.json({ success: true });
  } catch (e: any) {
    return Response.json({ error: e.message || "Invalid character data" }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await route.params;
    const input = patchCharacterSchema.parse(await request.json());

    const char = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!char) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    const updates: Partial<typeof characters.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.status) {
      updates.status = input.status;
      if (input.status === "published" && !char.publishedAt) {
        updates.publishedAt = new Date();
      }

      // Record review event
      await db.insert(characterReviews).values({
        characterId: id,
        reviewerId: adminSession.user.id,
        decision: input.status,
        note: input.reviewNote || `Status updated to ${input.status} by admin`,
      });
    }

    if (typeof input.featured === "boolean") {
      updates.featured = input.featured;
    }

    if (input.rating) {
      updates.rating = input.rating;
    }

    const [updated] = await db
      .update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();

    return Response.json({ character: updated });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Forbidden or invalid" },
      { status: 403 }
    );
  }
}

export async function DELETE(
  _request: Request,
  route: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await route.params;

    const char = await db.query.characters.findFirst({
      where: eq(characters.id, id),
    });

    if (!char) {
      return Response.json({ error: "Character not found" }, { status: 404 });
    }

    // Soft delete / archive
    await db
      .update(characters)
      .set({
        status: "archived",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(characters.id, id));

    return Response.json({ success: true, message: "Character archived" });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Forbidden" },
      { status: 403 }
    );
  }
}
