import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, categoryTranslations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const patchCategorySchema = z.object({
  active: z.boolean().optional(),
  vi: z.string().min(2).max(100).optional(),
  en: z.string().min(2).max(100).optional(),
});

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await route.params;
    const input = patchCategorySchema.parse(await request.json());

    if (typeof input.active === "boolean") {
      await db
        .update(categories)
        .set({ active: input.active, updatedAt: new Date() })
        .where(eq(categories.id, id));
    }

    if (input.vi) {
      await db
        .insert(categoryTranslations)
        .values({ categoryId: id, locale: "vi", name: input.vi })
        .onConflictDoUpdate({
          target: [categoryTranslations.categoryId, categoryTranslations.locale],
          set: { name: input.vi },
        });
    }

    if (input.en) {
      await db
        .insert(categoryTranslations)
        .values({ categoryId: id, locale: "en", name: input.en })
        .onConflictDoUpdate({
          target: [categoryTranslations.categoryId, categoryTranslations.locale],
          set: { name: input.en },
        });
    }

    const updated = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    return Response.json({ category: updated });
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

    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    return Response.json({ success: true, category: deleted });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
