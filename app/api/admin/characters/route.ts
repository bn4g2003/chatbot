import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  characterImages,
  characterPersonas,
  characterReviews,
  characterScenarios,
  characterStats,
  characterTranslations,
  characters,
  scenarioTranslations,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const featured = searchParams.get("featured");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (q) {
      whereConditions.push(
        or(
          ilike(characters.slug, `%${q}%`),
          ilike(characterTranslations.name, `%${q}%`)
        )
      );
    }

    if (status && status !== "all" && ["draft", "pending_review", "published", "rejected", "archived"].includes(status)) {
      whereConditions.push(eq(characters.status, status as any));
    }

    if (featured === "true") {
      whereConditions.push(eq(characters.featured, true));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(distinct ${characters.id})::int` })
      .from(characters)
      .leftJoin(characterTranslations, eq(characterTranslations.characterId, characters.id))
      .where(whereClause);

    const characterRows = await db
      .select({
        id: characters.id,
        slug: characters.slug,
        status: characters.status,
        rating: characters.rating,
        featured: characters.featured,
        originalLocale: characters.originalLocale,
        publishedAt: characters.publishedAt,
        createdAt: characters.createdAt,
        ownerId: characters.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
        views: characterStats.views,
        chats: characterStats.chats,
        likes: characterStats.likes,
      })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.ownerId))
      .leftJoin(characterStats, eq(characterStats.characterId, characters.id))
      .where(whereClause)
      .groupBy(
        characters.id,
        users.id,
        users.name,
        users.email,
        characterStats.views,
        characterStats.chats,
        characterStats.likes
      )
      .orderBy(desc(characters.createdAt))
      .limit(limit)
      .offset(offset);

    // Populate translations, images, persona preview, scenarios count
    const enrichedCharacters = await Promise.all(
      characterRows.map(async (char) => {
        const translations = await db
          .select()
          .from(characterTranslations)
          .where(eq(characterTranslations.characterId, char.id));

        const images = await db
          .select()
          .from(characterImages)
          .where(eq(characterImages.characterId, char.id));

        const persona = await db.query.characterPersonas.findFirst({
          where: eq(characterPersonas.characterId, char.id),
        });

        const scenarios = await db
          .select()
          .from(characterScenarios)
          .where(eq(characterScenarios.characterId, char.id));

        const localizedScenarios = await Promise.all(
          scenarios.map(async (sc) => {
            const scTrans = await db
              .select()
              .from(scenarioTranslations)
              .where(eq(scenarioTranslations.scenarioId, sc.id));
            return {
              ...sc,
              translations: scTrans,
            };
          })
        );

        const reviews = await db
          .select()
          .from(characterReviews)
          .where(eq(characterReviews.characterId, char.id))
          .orderBy(desc(characterReviews.createdAt))
          .limit(3);

        return {
          ...char,
          translations,
          images,
          persona,
          scenarios: localizedScenarios,
          reviews,
        };
      })
    );

    return Response.json({
      characters: enrichedCharacters,
      pagination: {
        total: totalRow?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((totalRow?.count ?? 0) / limit),
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
