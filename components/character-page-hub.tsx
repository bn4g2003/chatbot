"use client";

import { CharacterHubData, CharacterHubPreview } from "./character-hub-preview";
import { CharacterScenariosList } from "./character-scenarios-list";
import { CharacterCommentsSection, CommentItem } from "./character-comments-section";
import { TrendingCharacterItem, TrendingCharactersSidebar } from "./trending-characters-sidebar";
import { RecommendedCharacter, RecommendedCharactersGrid } from "./recommended-characters-grid";

export function CharacterPageHub({
  character,
  trendingCharacters,
  recommendedCharacters,
  locale,
}: {
  character: CharacterHubData;
  trendingCharacters: TrendingCharacterItem[];
  recommendedCharacters: RecommendedCharacter[];
  locale: string;
}) {
  return (
    <div className="character-hub-root">
      {/* Main 2-Column Hub Layout (Content + Trending Sidebar) */}
      <div className="hub-layout-columns">
        {/* Left Column: Hub Overview Content */}
        <div className="hub-main-column">
          {/* Character Hero & Metadata Box */}
          <CharacterHubPreview
            character={character}
            locale={locale}
          />

          {/* Chapter-style Scenarios List */}
          <CharacterScenariosList
            characterSlug={character.slug}
            scenarios={character.scenarios}
            locale={locale}
          />

          {/* Community Comments & Reviews Section */}
          <CharacterCommentsSection
            characterSlug={character.slug}
            characterName={character.translation.name}
            initialComments={character.comments as unknown as CommentItem[]}
            locale={locale}
          />
        </div>

        {/* Right Column: Trending Manga Characters Sidebar */}
        <div className="hub-sidebar-column">
          <TrendingCharactersSidebar
            characters={trendingCharacters}
            locale={locale}
            currentSlug={character.slug}
          />
        </div>
      </div>

      {/* Bottom Recommended Section */}
      <RecommendedCharactersGrid
        characters={recommendedCharacters}
        locale={locale}
      />
    </div>
  );
}
