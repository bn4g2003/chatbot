"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { RemoteImage } from "./remote-image";

export type RecommendedCharacter = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl?: string | null;
  views?: number | null;
  chats?: number | null;
  likes?: number | null;
};

export function RecommendedCharactersGrid({
  characters,
  locale,
}: {
  characters: RecommendedCharacter[];
  locale: string;
}) {
  const vi = locale === "vi";
  if (!characters || characters.length === 0) return null;

  return (
    <section className="hub-recommended-section">
      <div className="recommended-heading-row">
        <div className="heading-left">
          <h3>{vi ? "Nhân vật tương tự" : "Related Characters"}</h3>
        </div>
        <Link href={`/${locale}`} className="view-all-link">
          {vi ? "Xem thêm" : "View all"}
        </Link>
      </div>

      <div className="recommended-cards-grid">
        {characters.map((item) => (
          <Link
            key={item.id}
            href={`/${locale}/characters/${item.slug}`}
            className="recommended-card"
          >
            <div className="recommended-cover-wrap">
              <RemoteImage src={item.imageUrl} alt={item.name} />
            </div>

            <div className="recommended-body">
              <h4 className="recommended-title">{item.name}</h4>
              <p className="recommended-snippet">{item.shortDescription}</p>

              <div className="recommended-meta">
                <div className="stars-mini-row">
                  <Star className="star-mini filled" />
                  <span>5.0</span>
                </div>
                <span className="views-count">
                  {(item.views ?? 0).toLocaleString()} {vi ? "lượt xem" : "views"}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
