import { notFound } from "next/navigation";
import { CharacterExperience } from "@/components/character-experience";
import { ViewTracker } from "@/components/view-tracker";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";

export default async function CharacterChatPage({
  params,
  searchParams,
}: PageProps<"/[locale]/characters/[slug]">) {
  const { locale, slug } = await params;
  const { chat, scenarioId } = await searchParams;
  const conversationId = typeof chat === "string" ? chat : undefined;
  const initialScenarioId = typeof scenarioId === "string" ? scenarioId : undefined;

  const character = await getCharacter(slug, locale);
  if (!character) notFound();

  const avatar =
    character.images.find((image) => image.type === "avatar") ??
    character.images[0];
  const cover =
    character.images.find((image) => image.type === "cover") ??
    avatar;

  return (
    <main className="dedicated-chat-page-container">
      <ViewTracker slug={slug} />

      <div className="dedicated-chat-wrapper">
        <CharacterExperience
          characterId={character.id}
          characterSlug={character.slug}
          characterName={character.translation.name}
          characterAvatar={avatar?.url}
          characterCover={cover?.url}
          scenarios={character.scenarios}
          locale={locale}
          conversationId={conversationId}
          initialScenarioId={initialScenarioId}
        />
      </div>
    </main>
  );
}
