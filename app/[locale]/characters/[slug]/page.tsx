import { notFound } from "next/navigation";
import { CharacterPageHub } from "@/components/character-page-hub";
import { ViewTracker } from "@/components/view-tracker";
import {
  getCharacter,
  getRecommendedCharacters,
  getTrendingCharacters,
} from "@/lib/characters";
import { db } from "@/lib/db";
import { characters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const revalidate = 60;

export async function generateStaticParams() {
  return db
    .select({ slug: characters.slug })
    .from(characters)
    .where(eq(characters.status, "published"));
}

export default async function CharacterPreviewPage({
  params,
}: PageProps<"/[locale]/characters/[slug]">) {
  const { locale, slug } = await params;

  const characterPromise = getCharacter(slug, locale);
  const trendingPromise = getTrendingCharacters(locale, 8);
  const character = await characterPromise;
  if (!character) notFound();

  const [trendingCharacters, recommendedCharacters] = await Promise.all([
    trendingPromise,
    getRecommendedCharacters(character.id, locale, 5),
  ]);

  return (
    <main className="character-hub-page-container">
      <ViewTracker slug={slug} />
      <CharacterPageHub
        character={character}
        trendingCharacters={trendingCharacters}
        recommendedCharacters={recommendedCharacters}
        locale={locale}
      />
    </main>
  );
}
