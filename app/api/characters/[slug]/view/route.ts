import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  characters,
  characterStats,
  characterViews,
} from "@/lib/db/schema";
import { getSession } from "@/lib/session";

export async function POST(
  _request: Request,
  route: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await route.params;
    const character = await db.query.characters.findFirst({
      where: eq(characters.slug, slug),
    });
    if (!character || character.status !== "published") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const session = await getSession();
    const requestHeaders = await headers();
    const fingerprint = createHash("sha256")
      .update(
        `${requestHeaders.get("x-forwarded-for") ?? "local"}:${
          requestHeaders.get("user-agent") ?? "unknown"
        }:${new Date().toISOString().slice(0, 10)}`,
      )
      .digest("hex");

    const counted = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${character.id}:${fingerprint}`}, 0))`,
      );

      const [existingView] = await tx
        .select({ id: characterViews.id })
        .from(characterViews)
        .where(
          and(
            eq(characterViews.characterId, character.id),
            eq(characterViews.visitorHash, fingerprint),
          ),
        )
        .limit(1);

      if (existingView) return false;

      await tx
        .insert(characterViews)
        .values({
          characterId: character.id,
          userId: session?.user.id,
          visitorHash: fingerprint,
        });

      await tx
        .insert(characterStats)
        .values({ characterId: character.id, views: 1, trendingScore: 1 })
        .onConflictDoUpdate({
          target: characterStats.characterId,
          set: {
            views: sql`${characterStats.views} + 1`,
            trendingScore: sql`${characterStats.trendingScore} + 1`,
            updatedAt: new Date(),
          },
        });
      return true;
    });

    return Response.json({ ok: true, counted });
  } catch (error) {
    console.error("Failed to record character view", error);
    return Response.json(
      { error: "Unable to record view" },
      { status: 500 },
    );
  }
}
