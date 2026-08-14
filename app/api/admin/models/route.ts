import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { aiModels } from "@/lib/ai/models";
import { db } from "@/lib/db";
import { aiModelsTable } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    // Ensure models from code are seeded in DB
    for (const m of aiModels) {
      await db
        .insert(aiModelsTable)
        .values({
          provider: m.provider,
          modelId: m.id,
          label: m.label,
          active: true,
          isDefault: m.id === "gemini-2.5-flash",
        })
        .onConflictDoNothing();
    }

    const models = await db.select().from(aiModelsTable).orderBy(desc(aiModelsTable.isDefault));
    return Response.json({ models });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}

const updateModelSchema = z.object({
  modelId: z.string(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const input = updateModelSchema.parse(await request.json());

    if (input.isDefault) {
      // Clear previous default
      await db.update(aiModelsTable).set({ isDefault: false });
    }

    const updates: Partial<typeof aiModelsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof input.active === "boolean") updates.active = input.active;
    if (typeof input.isDefault === "boolean") {
      updates.isDefault = input.isDefault;
      if (input.isDefault) updates.active = true; // default model must be active
    }

    const [updated] = await db
      .update(aiModelsTable)
      .set(updates)
      .where(eq(aiModelsTable.modelId, input.modelId))
      .returning();

    return Response.json({ model: updated });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden or invalid" }, { status: 403 });
  }
}
