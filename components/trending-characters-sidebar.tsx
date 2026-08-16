"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { RemoteImage } from "./remote-image";

export type TrendingCharacterItem = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  imageUrl?: string | null;
  views?: number | null;
  chats?: number | null;
  likes?: number | null;
  trendingScore?: number | null;
};

export function TrendingCharactersSidebar({
  characters,
  locale,
  currentSlug,
}: {
  characters: TrendingCharacterItem[];
  locale: string;
  currentSlug: string;
}) {
  const vi = locale === "vi";

  return (
    <aside className="hub-trending-sidebar">
      <div className="trending-sidebar-header">
        <h3>{vi ? "Nhân vật thịnh hành" : "Trending"}</h3>
      </div>

      <div className="trending-sidebar-list">
        {characters.map((item, index) => {
          const rank = index + 1;
          const isCurrent = item.slug === currentSlug;

          return (
            <Link
              key={item.id}
              href={`/${locale}/characters/${item.slug}`}
              className={`trending-item-card ${isCurrent ? "current" : ""}`}
            >
              {/* Rank Number */}
              <span className="trending-rank-num">
                {rank < 10 ? `0${rank}` : rank}
              </span>

              {/* Character Avatar */}
              <div className="trending-item-avatar">
                <RemoteImage src={item.imageUrl} alt={item.name} />
              </div>

              {/* Character Info */}
              <div className="trending-item-info">
                <h4 className="trending-name">{item.name}</h4>
                <p className="trending-desc">{item.shortDescription}</p>

                <div className="trending-stats-row">
                  <span className="trending-score">
                    <Star className="star-mini filled" />
                    5.0
                  </span>
                  <span className="trending-views">
                    {(item.views ?? 0).toLocaleString(locale)} {vi ? "lượt xem" : "views"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
