import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { httpsImageUrl } from "@/lib/validation";

const updateBannerSchema = z.object({
  imageUrl: httpsImageUrl.optional(),
  href: z.string().url().max(2048).nullable().optional(),
  title: z.string().min(2).max(200).optional(),
  locale: z.enum(["vi", "en"]).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await route.params;
    const input = updateBannerSchema.parse(await request.json());

    const updates: Partial<typeof banners.$inferInsert> = {
      ...input,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(banners)
      .set(updates)
      .where(eq(banners.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "Banner not found" }, { status: 404 });
    }

    return Response.json({ banner: updated });
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
      .delete(banners)
      .where(eq(banners.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Banner not found" }, { status: 404 });
    }

    return Response.json({ success: true, banner: deleted });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
