import { Eye, Heart, MessageCircle, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterExperience } from "@/components/character-experience";
import { RemoteImage } from "@/components/remote-image";
import { ViewTracker } from "@/components/view-tracker";
import { getCharacter } from "@/lib/characters";

export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
  searchParams,
}: PageProps<"/[locale]/characters/[slug]">) {
  const { locale, slug } = await params;
  const { chat } = await searchParams;
  const conversationId = typeof chat === "string" ? chat : undefined;
  const character = await getCharacter(slug, locale);
  if (!character) notFound();
  const cover =
    character.images.find((image) => image.type === "cover") ??
    character.images[0];
  const avatar =
    character.images.find((image) => image.type === "avatar") ?? cover;
  const vi = locale === "vi";

  return (
    <main className="detail-page">
      <ViewTracker slug={slug} />
      <section className="character-hero">
        <div className="character-backdrop">
          <RemoteImage src={cover?.url} alt="" />
        </div>
        <div className="character-identity">
          <RemoteImage
            src={avatar?.url}
            alt={character.translation.name}
            className="detail-avatar"
          />
          <div>
            <span className="content-chip">{character.rating}</span>
            <h1>{character.translation.name}</h1>
            <p>{character.translation.shortDescription}</p>
            <div className="stats">
              <span>
                <Eye />
                {character.stats?.views ?? 0}
              </span>
              <span>
                <MessageCircle />
                {character.stats?.chats ?? 0}
              </span>
              <span>
                <Heart />
                {character.stats?.likes ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      <CharacterExperience
        characterId={character.id}
        characterSlug={character.slug}
        characterName={character.translation.name}
        scenarios={character.scenarios}
        locale={locale}
        conversationId={conversationId}
      />

      <div className="detail-layout">
        <article>
          <section className="prose-section">
            <p className="eyebrow">
              {vi ? "Gặp gỡ nhân vật" : "Meet the character"}
            </p>
            <h2>
              {vi ? "Về" : "About"} {character.translation.name}
            </h2>
            <p>{character.translation.description}</p>
            <p>{character.translation.biography}</p>
          </section>
          {character.images.some((image) => image.type === "gallery") && (
            <section className="gallery">
              {character.images
                .filter((image) => image.type === "gallery")
                .map((image) => (
                  <RemoteImage
                    key={image.id}
                    src={image.url}
                    alt={image.altText ?? character.translation.name}
                  />
                ))}
            </section>
          )}
        </article>
        <aside className="story-panel">
          <ShieldCheck />
          <p>{vi ? "Nhân vật đã được duyệt" : "Reviewed character"}</p>
          <small>
            {vi
              ? `Tạo bởi ${character.owner}`
              : `Created by ${character.owner}`}
          </small>
          <p className="privacy-note">
            {vi
              ? "Bối cảnh và cách xưng hô được lưu riêng cho từng cuộc trò chuyện."
              : "Scenario and preferences are saved per conversation."}
          </p>
        </aside>
      </div>
    </main>
  );
}
