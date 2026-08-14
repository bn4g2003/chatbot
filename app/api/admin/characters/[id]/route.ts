import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { characterReviews, characters } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const patchCharacterSchema = z.object({
  status: z
    .enum(["draft", "pending_review", "published", "rejected", "archived"])
    .optional(),
  featured: z.boolean().optional(),
  rating: z.enum(["general", "sensitive", "adult"]).optional(),
  reviewNote: z.string().max(500).optional(),
});

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
