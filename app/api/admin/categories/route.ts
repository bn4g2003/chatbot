import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, categoryTranslations } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  vi: z.string().min(2).max(100),
  en: z.string().min(2).max(100),
});

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(categories).orderBy(asc(categories.slug));

    const enriched = await Promise.all(
      rows.map(async (cat) => {
        const trans = await db
          .select()
          .from(categoryTranslations)
          .where(eq(categoryTranslations.categoryId, cat.id));
        const vi = trans.find((t) => t.locale === "vi")?.name || "";
        const en = trans.find((t) => t.locale === "en")?.name || "";
        return {
          ...cat,
          vi,
          en,
        };
      })
    );

    return Response.json({ categories: enriched });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = schema.parse(await request.json());

    const result = await db.transaction(async (tx) => {
      const [category] = await tx
        .insert(categories)
        .values({ slug: input.slug, active: true })
        .returning();

      await tx.insert(categoryTranslations).values([
        { categoryId: category.id, locale: "vi", name: input.vi },
        { categoryId: category.id, locale: "en", name: input.en },
      ]);

      return {
        ...category,
        vi: input.vi,
        en: input.en,
      };
    });

    return Response.json(result, { status: 201 });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Forbidden or invalid" },
      { status: 403 }
    );
  }
}
