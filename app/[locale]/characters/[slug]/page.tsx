import { notFound } from "next/navigation";
import { CharacterPageHub } from "@/components/character-page-hub";
import { ViewTracker } from "@/components/view-tracker";
import {
  getCharacter,
  getRecommendedCharacters,
  getTrendingCharacters,
} from "@/lib/characters";

export const dynamic = "force-dynamic";

export default async function CharacterPreviewPage({
  params,
}: PageProps<"/[locale]/characters/[slug]">) {
  const { locale, slug } = await params;

  const character = await getCharacter(slug, locale);
  if (!character) notFound();

  const [trendingCharacters, recommendedCharacters] = await Promise.all([
    getTrendingCharacters(locale, 8),
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
