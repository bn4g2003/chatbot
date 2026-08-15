import "server-only";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import {
  categories,
  categoryTranslations,
  characterCategories,
  characterComments,
  characterImages,
  characterPersonas,
  characterScenarios,
  characterStats,
  characterTranslations,
  characters,
  scenarioTranslations,
  users,
} from "./db/schema";

export async function listCharacters(
  locale: string,
  options: {
    q?: string;
    sort?: "trending" | "views" | "new";
    limit?: number;
    categoryId?: string;
  } = {},
) {
  const fallback = locale === "vi" ? "en" : "vi";
  const q = options.q?.trim();
  const fallbackTranslation = alias(
    characterTranslations,
    "fallback_translation",
  );

  const rows = await db
    .select({
      id: characters.id,
      slug: characters.slug,
      rating: characters.rating,
      publishedAt: characters.publishedAt,
      name: sql<string>`coalesce(${characterTranslations.name}, ${fallbackTranslation.name})`,
      description: sql<string>`coalesce(${characterTranslations.shortDescription}, ${fallbackTranslation.shortDescription})`,
      imageUrl: sql<string | null>`(select url from character_images where character_id = ${characters.id} and type in ('cover','avatar') order by case when type='cover' then 0 else 1 end, sort_order limit 1)`,
      views: characterStats.views,
      chats: characterStats.chats,
      likes: characterStats.likes,
      trending: characterStats.trendingScore,
    })
    .from(characters)
    .leftJoin(
      characterTranslations,
      and(
        eq(characterTranslations.characterId, characters.id),
        eq(characterTranslations.locale, locale),
      ),
    )
    .leftJoin(
      fallbackTranslation,
      and(
        eq(fallbackTranslation.characterId, characters.id),
        eq(fallbackTranslation.locale, fallback),
      ),
    )
    .leftJoin(characterStats, eq(characterStats.characterId, characters.id))
    .where(
      and(
        eq(characters.status, "published"),
        q
          ? or(
              sql`to_tsvector('simple', coalesce(${characterTranslations.name}, '') || ' ' || coalesce(${characterTranslations.shortDescription}, '')) @@ plainto_tsquery('simple', ${q})`,
              sql`similarity(coalesce(${characterTranslations.name}, ''), ${q}) > 0.15`,
              ilike(characterTranslations.name, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(
      options.sort === "views"
        ? desc(characterStats.views)
        : options.sort === "new"
          ? desc(characters.publishedAt)
          : desc(characterStats.trendingScore),
    )
    .limit(Math.min(options.limit ?? 12, 50));

  return rows;
}

export async function getCharacter(slug: string, locale: string) {
  const [base] = await db
    .select({
      id: characters.id,
      slug: characters.slug,
      rating: characters.rating,
      owner: users.name,
      ownerRole: users.role,
      originalLocale: characters.originalLocale,
      publishedAt: characters.publishedAt,
    })
    .from(characters)
    .innerJoin(users, eq(users.id, characters.ownerId))
    .where(and(eq(characters.slug, slug), eq(characters.status, "published")))
    .limit(1);

  if (!base) return null;

  const translationRows = await db
    .select()
    .from(characterTranslations)
    .where(eq(characterTranslations.characterId, base.id));

  const translation =
    translationRows.find((x) => x.locale === locale) ??
    translationRows.find((x) => x.locale === base.originalLocale) ??
    translationRows[0];

  const persona = await db
    .select()
    .from(characterPersonas)
    .where(eq(characterPersonas.characterId, base.id))
    .limit(1);

  const images = await db
    .select()
    .from(characterImages)
    .where(eq(characterImages.characterId, base.id))
    .orderBy(asc(characterImages.sortOrder));

  const scenarios = await db
    .select({
      id: characterScenarios.id,
      sortOrder: characterScenarios.sortOrder,
    })
    .from(characterScenarios)
    .where(
      and(
        eq(characterScenarios.characterId, base.id),
        eq(characterScenarios.active, true),
      ),
    )
    .orderBy(asc(characterScenarios.sortOrder));

  const localizedScenarios = await Promise.all(
    scenarios.map(async (scenario) => {
      const rows = await db
        .select()
        .from(scenarioTranslations)
        .where(eq(scenarioTranslations.scenarioId, scenario.id));
      return {
        ...scenario,
        translation:
          rows.find((x) => x.locale === locale) ??
          rows.find((x) => x.locale === base.originalLocale) ??
          rows[0],
      };
    }),
  );

  const stats = await db.query.characterStats.findFirst({
    where: eq(characterStats.characterId, base.id),
  });

  // Get categories
  const categoryRows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categoryTranslations.name,
    })
    .from(characterCategories)
    .innerJoin(categories, eq(categories.id, characterCategories.categoryId))
    .leftJoin(
      categoryTranslations,
      and(
        eq(categoryTranslations.categoryId, categories.id),
        eq(categoryTranslations.locale, locale),
      ),
    )
    .where(eq(characterCategories.characterId, base.id));

  // Get comments
  const comments = await db
    .select({
      id: characterComments.id,
      content: characterComments.content,
      rating: characterComments.rating,
      likesCount: characterComments.likesCount,
      createdAt: characterComments.createdAt,
      userName: users.name,
      userImage: users.image,
      userRole: users.role,
    })
    .from(characterComments)
    .innerJoin(users, eq(users.id, characterComments.userId))
    .where(eq(characterComments.characterId, base.id))
    .orderBy(desc(characterComments.createdAt))
    .limit(20);

  return translation
    ? {
        ...base,
        translation,
        persona: persona[0] ?? null,
        images,
        scenarios: localizedScenarios.filter((x) => x.translation),
        stats,
        categories: categoryRows,
        comments,
      }
    : null;
}

export async function getTrendingCharacters(locale: string, limit = 8) {
  const fallback = locale === "vi" ? "en" : "vi";
  const fallbackTranslation = alias(
    characterTranslations,
    "fallback_translation",
  );

  const rows = await db
    .select({
      id: characters.id,
      slug: characters.slug,
      rating: characters.rating,
      name: sql<string>`coalesce(${characterTranslations.name}, ${fallbackTranslation.name})`,
      shortDescription: sql<string>`coalesce(${characterTranslations.shortDescription}, ${fallbackTranslation.shortDescription})`,
      imageUrl: sql<string | null>`(select url from character_images where character_id = ${characters.id} and type in ('cover','avatar') order by case when type='cover' then 0 else 1 end, sort_order limit 1)`,
      views: characterStats.views,
      chats: characterStats.chats,
      likes: characterStats.likes,
      trendingScore: characterStats.trendingScore,
    })
    .from(characters)
    .leftJoin(
      characterTranslations,
      and(
        eq(characterTranslations.characterId, characters.id),
        eq(characterTranslations.locale, locale),
      ),
    )
    .leftJoin(
      fallbackTranslation,
      and(
        eq(fallbackTranslation.characterId, characters.id),
        eq(fallbackTranslation.locale, fallback),
      ),
    )
    .leftJoin(characterStats, eq(characterStats.characterId, characters.id))
    .where(eq(characters.status, "published"))
    .orderBy(desc(characterStats.trendingScore), desc(characterStats.views))
    .limit(limit);

  return rows;
}

export async function getRecommendedCharacters(
  currentId: string,
  locale: string,
  limit = 5,
) {
  const fallback = locale === "vi" ? "en" : "vi";
  const fallbackTranslation = alias(
    characterTranslations,
    "fallback_translation",
  );

  const rows = await db
    .select({
      id: characters.id,
      slug: characters.slug,
      rating: characters.rating,
      name: sql<string>`coalesce(${characterTranslations.name}, ${fallbackTranslation.name})`,
      shortDescription: sql<string>`coalesce(${characterTranslations.shortDescription}, ${fallbackTranslation.shortDescription})`,
      imageUrl: sql<string | null>`(select url from character_images where character_id = ${characters.id} and type in ('cover','avatar') order by case when type='cover' then 0 else 1 end, sort_order limit 1)`,
      views: characterStats.views,
      chats: characterStats.chats,
      likes: characterStats.likes,
    })
    .from(characters)
    .leftJoin(
      characterTranslations,
      and(
        eq(characterTranslations.characterId, characters.id),
        eq(characterTranslations.locale, locale),
      ),
    )
    .leftJoin(
      fallbackTranslation,
      and(
        eq(fallbackTranslation.characterId, characters.id),
        eq(fallbackTranslation.locale, fallback),
      ),
    )
    .leftJoin(characterStats, eq(characterStats.characterId, characters.id))
    .where(
      and(eq(characters.status, "published"), ne(characters.id, currentId)),
    )
    .orderBy(desc(characterStats.views), desc(characterStats.chats))
    .limit(limit);

  return rows;
}

export async function getCharacterContext(
  characterId: string,
  scenarioId: string,
  locale: string,
) {
  const [character] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);
  if (!character) return null;
  const translations = await db
    .select()
    .from(characterTranslations)
    .where(eq(characterTranslations.characterId, characterId));
  const translation =
    translations.find((x) => x.locale === locale) ??
    translations.find((x) => x.locale === character.originalLocale) ??
    translations[0];
  const persona = await db.query.characterPersonas.findFirst({
    where: eq(characterPersonas.characterId, characterId),
  });
  const [scenario] = await db
    .select()
    .from(characterScenarios)
    .where(
      and(
        eq(characterScenarios.id, scenarioId),
        eq(characterScenarios.characterId, characterId),
      ),
    )
    .limit(1);
  const scenarioTranslationsRows = scenario
    ? await db
        .select()
        .from(scenarioTranslations)
        .where(eq(scenarioTranslations.scenarioId, scenarioId))
    : [];
  const scenarioTranslation =
    scenarioTranslationsRows.find((x) => x.locale === locale) ??
    scenarioTranslationsRows.find((x) => x.locale === character.originalLocale) ??
    scenarioTranslationsRows[0];
  if (!translation || !persona || !scenario || !scenarioTranslation)
    return null;
  return { character, translation, persona, scenario, scenarioTranslation };
}
