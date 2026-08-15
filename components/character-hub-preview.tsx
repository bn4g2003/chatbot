"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  Share2,
  Star,
} from "lucide-react";
import { RemoteImage } from "./remote-image";

export type CharacterHubData = {
  id: string;
  slug: string;
  rating: string;
  owner: string;
  ownerRole?: string;
  originalLocale: string;
  publishedAt?: Date | null;
  translation: {
    name: string;
    shortDescription: string;
    description: string;
    biography: string;
  };
  persona?: {
    canon?: string;
    personality?: string;
    speechStyle?: string;
    relationships?: string;
  } | null;
  images: Array<{
    id: string;
    url: string;
    type: "avatar" | "cover" | "gallery";
    altText?: string | null;
  }>;
  scenarios: Array<{
    id: string;
    sortOrder: number;
    translation?: {
      title: string;
      description: string;
      location: string;
      time: string;
      userRole: string;
      relationship: string;
      goal: string;
      openingMessage: string;
    };
  }>;
  stats?: {
    views?: number | null;
    chats?: number | null;
    likes?: number | null;
    trendingScore?: number | null;
  } | null;
  categories?: Array<{
    id: string;
    slug: string;
    name?: string | null;
  }>;
  comments?: Array<{
    id: string;
    content: string;
    rating: number;
    likesCount: number;
    createdAt: Date | string;
    userName: string;
    userImage?: string | null;
    userRole?: string;
  }>;
};

export function CharacterHubPreview({
  character,
  locale,
}: {
  character: CharacterHubData;
  locale: string;
}) {
  const [expandedBio, setExpandedBio] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(character.stats?.likes ?? 0);
  const [copiedLink, setCopiedLink] = useState(false);
  const vi = locale === "vi";

  const cover =
    character.images.find((img) => img.type === "cover") ?? character.images[0];
  const avatar =
    character.images.find((img) => img.type === "avatar") ?? cover;

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/characters/${character.slug}/like`, {
        method: "POST",
      });
      if (res.ok) {
        setIsLiked((prev) => !prev);
        setLikesCount((prev) => (isLiked ? (prev ?? 1) - 1 : (prev ?? 0) + 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookmark = async () => {
    try {
      const res = await fetch(`/api/characters/${character.slug}/bookmark`, {
        method: "POST",
      });
      if (res.ok) {
        setIsBookmarked((prev) => !prev);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Derive series or manga origin
  const originSeries =
    character.persona?.canon ||
    (character.slug.includes("frieren")
      ? "Sousou no Frieren"
      : character.slug.includes("makima")
        ? "Chainsaw Man"
        : character.slug.includes("gojo")
          ? "Jujutsu Kaisen"
          : character.slug.includes("yor")
            ? "Spy x Family"
            : character.slug.includes("marin")
              ? "Sono Bisque Doll wa Koi wo Suru"
              : character.slug.includes("kaguya")
                ? "Kaguya-sama: Love Is War"
                : character.slug.includes("nami")
                  ? "One Piece"
                  : character.slug.includes("mikasa")
                    ? "Attack on Titan"
                    : character.slug.includes("luffy")
                      ? "One Piece"
                      : "Manga / Anime");

  const totalReviews = (character.stats?.views || 10) * 3 + 12;

  return (
    <div className="character-hub-overview">
      {/* Breadcrumb Bar */}
      <nav className="hub-breadcrumbs" aria-label="Breadcrumb">
        <Link href={`/${locale}`}>{vi ? "Trang chủ" : "Home"}</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/${locale}?q=${encodeURIComponent(originSeries)}`}>
          {originSeries}
        </Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{character.translation.name}</span>
      </nav>

      {/* Main Hub Card */}
      <div className="hub-hero-card">
        {/* Left Column: Poster & Interaction Actions */}
        <div className="hub-poster-column">
          <div className="hub-poster-wrapper">
            <RemoteImage
              src={avatar?.url}
              alt={character.translation.name}
              className="hub-poster-image"
            />
          </div>

          {/* Rating */}
          <div className="hub-rating-box">
            <Star className="star-filled" />
            <span className="rating-score">5.0</span>
            <span className="rating-count">
              ({totalReviews} {vi ? "đánh giá" : "reviews"})
            </span>
          </div>

          {/* Actions: Follow, Like, Share */}
          <div className="hub-poster-actions">
            <button
              type="button"
              className={`hub-btn-follow ${isBookmarked ? "active" : ""}`}
              onClick={handleBookmark}
            >
              <Bookmark />
              <span>
                {isBookmarked
                  ? vi
                    ? "Đã theo dõi"
                    : "Following"
                  : vi
                    ? "Theo dõi"
                    : "Follow"}
              </span>
            </button>

            <button
              type="button"
              className={`hub-btn-like ${isLiked ? "active" : ""}`}
              onClick={handleLike}
            >
              <Heart />
              <span>{likesCount ?? 0}</span>
            </button>

            <button
              type="button"
              className="hub-btn-share"
              onClick={handleShare}
              title={vi ? "Sao chép liên kết" : "Copy link"}
            >
              <Share2 />
              {copiedLink && (
                <span className="copied-tooltip">
                  {vi ? "Đã sao chép" : "Copied"}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Character Information & Metadata */}
        <div className="hub-info-column">
          <h1 className="hub-character-title">{character.translation.name}</h1>
          <p className="hub-short-desc">
            {character.translation.shortDescription}
          </p>

          {/* Metadata Specs Table - Clean Typography */}
          <div className="hub-specs-grid">
            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Tác phẩm:" : "Origin:"}
              </span>
              <span className="spec-value highlight">{originSeries}</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Tác giả bot:" : "Creator:"}
              </span>
              <span className="spec-value">{character.owner}</span>
            </div>

            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Lượt xem:" : "Views:"}
              </span>
              <span className="spec-value">
                {(character.stats?.views ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Lượt chat:" : "Chats:"}
              </span>
              <span className="spec-value">
                {(character.stats?.chats ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Kịch bản:" : "Scenarios:"}
              </span>
              <span className="spec-value">
                {character.scenarios.length} {vi ? "bối cảnh" : "scenarios"}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-label">
                {vi ? "Độ tuổi:" : "Rating:"}
              </span>
              <span className="spec-value age-tag">
                {character.rating === "adult"
                  ? "18+"
                  : character.rating === "sensitive"
                    ? "16+"
                    : "13+"}
              </span>
            </div>

            <div className="spec-row full-width">
              <span className="spec-label">{vi ? "Thể loại:" : "Genres:"}</span>
              <div className="spec-tags">
                {character.categories && character.categories.length > 0 ? (
                  character.categories.map((c) => (
                    <span key={c.id} className="genre-chip">
                      {c.name || c.slug}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="genre-chip">Anime</span>
                    <span className="genre-chip">Manga</span>
                    <span className="genre-chip">Roleplay</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Primary Hub Call to Action Buttons */}
          <div className="hub-cta-buttons">
            <Link
              href={`/${locale}/characters/${character.slug}/chat`}
              className="btn-enter-chat"
            >
              <span>
                {vi ? "Bắt đầu trò chuyện" : "Start Chat"}
              </span>
            </Link>

            <a href="#scenarios-section" className="btn-view-scenarios">
              <span>{vi ? "Danh sách kịch bản" : "Scenarios"}</span>
            </a>

            <a href="#comments-section" className="btn-view-reviews">
              <span>{vi ? "Bình luận" : "Comments"}</span>
            </a>
          </div>

          {/* Character Synopsis / Story */}
          <div className="hub-synopsis-box">
            <h3>
              {vi ? "Giới thiệu & Cốt truyện" : "Synopsis & Background"}
            </h3>
            <p className="synopsis-text">
              {character.translation.description}
            </p>

            {expandedBio && (
              <div className="synopsis-more-content">
                <p>{character.translation.biography}</p>
                {character.persona?.personality && (
                  <div className="persona-highlight">
                    <strong>
                      {vi
                        ? "Tính cách & phong thái:"
                        : "Personality:"}
                    </strong>
                    <p>{character.persona.personality}</p>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="toggle-synopsis-btn"
              onClick={() => setExpandedBio((prev) => !prev)}
            >
              <span>
                {expandedBio
                  ? vi
                    ? "Thu gọn"
                    : "Show less"
                  : vi
                    ? "Xem thêm chi tiết"
                    : "Read more"}
              </span>
              {expandedBio ? <ChevronUp /> : <ChevronDown />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
