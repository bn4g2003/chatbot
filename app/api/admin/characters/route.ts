import { and, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
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
          exists(
            db
              .select({ value: sql`1` })
              .from(characterTranslations)
              .where(
                and(
                  eq(characterTranslations.characterId, characters.id),
                  ilike(characterTranslations.name, `%${q}%`)
                )
              )
          )
        )
      );
    }

    if (status && status !== "all" && ["draft", "pending_review", "published", "rejected", "archived"].includes(status)) {
      whereConditions.push(
        eq(
          characters.status,
          status as "draft" | "pending_review" | "published" | "rejected" | "archived"
        )
      );
    }

    if (featured === "true") {
      whereConditions.push(eq(characters.featured, true));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [[totalRow], characterRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(characters)
        .where(whereClause),
      db
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
        .orderBy(desc(characters.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const characterIds = characterRows.map((character) => character.id);
    const [translationRows, imageRows, personaRows, scenarioRows, reviewRows] =
      characterIds.length > 0
        ? await Promise.all([
            db
              .select()
              .from(characterTranslations)
              .where(inArray(characterTranslations.characterId, characterIds)),
            db
              .select()
              .from(characterImages)
              .where(inArray(characterImages.characterId, characterIds)),
            db
              .select()
              .from(characterPersonas)
              .where(inArray(characterPersonas.characterId, characterIds)),
            db
              .select()
              .from(characterScenarios)
              .where(inArray(characterScenarios.characterId, characterIds)),
            db
              .select()
              .from(characterReviews)
              .where(inArray(characterReviews.characterId, characterIds))
              .orderBy(desc(characterReviews.createdAt)),
          ])
        : [[], [], [], [], []];

    const scenarioIds = scenarioRows.map((scenario) => scenario.id);
    const scenarioTranslationRows = scenarioIds.length > 0
      ? await db
          .select()
          .from(scenarioTranslations)
          .where(inArray(scenarioTranslations.scenarioId, scenarioIds))
      : [];

    const enrichedCharacters = characterRows.map((character) => ({
      ...character,
      translations: translationRows.filter((row) => row.characterId === character.id),
      images: imageRows.filter((row) => row.characterId === character.id),
      persona: personaRows.find((row) => row.characterId === character.id) ?? null,
      scenarios: scenarioRows
        .filter((scenario) => scenario.characterId === character.id)
        .map((scenario) => ({
          ...scenario,
          translations: scenarioTranslationRows.filter(
            (translation) => translation.scenarioId === scenario.id
          ),
        })),
      reviews: reviewRows
        .filter((review) => review.characterId === character.id)
        .slice(0, 3),
    }));

    return Response.json({
      characters: enrichedCharacters,
      pagination: {
        total: totalRow?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((totalRow?.count ?? 0) / limit),
      },
    });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status: 403 }
    );
  }
}
