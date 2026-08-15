"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { RemoteImage } from "./remote-image";

export type BannerItem = {
  id: string;
  imageUrl: string;
  title: string;
  href?: string | null;
  active?: boolean;
  sortOrder?: number;
};

export function BannerCarousel({
  banners = [],
  locale = "vi",
  autoPlayInterval = 5500,
}: {
  banners: BannerItem[];
  locale?: string;
  autoPlayInterval?: number;
}) {
  // If no banners provided, use the defaults from public/banner (3 images)
  const activeBanners =
    banners.length > 0
      ? banners.filter((b) => b.active !== false)
      : [
          {
            id: "default-1",
            imageUrl: "/banner/banner1.png",
            title:
              locale === "vi"
                ? "Khám phá thế giới Manga & Anime - Trò chuyện cùng nhân vật bạn yêu thích"
                : "Explore the Manga & Anime Realm - Chat with your favorite characters",
            href: `/${locale}`,
          },
          {
            id: "default-2",
            imageUrl: "/banner/2.png",
            title:
              locale === "vi"
                ? "Bước vào những câu chuyện nhập vai sống động và chân thực cùng Lorelia"
                : "Step into vivid, captivating roleplay stories with Lorelia",
            href: `/${locale}/creator`,
          },
          {
            id: "default-3",
            imageUrl: "/banner/3.png",
            title:
              locale === "vi"
                ? "Tự do sáng tạo bối cảnh, tính cách và câu chuyện của riêng bạn"
                : "Freely craft your own unique personas, scenarios, and lore",
            href: `/${locale}/creator`,
          },
        ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const vi = locale === "vi";

  // Auto-advance slide
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeBanners.length, isPaused, autoPlayInterval]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const goToPrev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + activeBanners.length) % activeBanners.length,
    );
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 40; // minimum swipe distance

    if (diff > threshold) {
      goToNext(); // Swiped left -> next slide
    } else if (diff < -threshold) {
      goToPrev(); // Swiped right -> previous slide
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (activeBanners.length === 0) return null;

  return (
    <section
      className="banner-carousel-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Featured Banners"
    >
      <div className="banner-slides-track">
        {activeBanners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={banner.id || index}
              className={`banner-slide ${isActive ? "active" : ""}`}
              aria-hidden={!isActive}
            >
              <div className="banner-image-wrapper">
                <RemoteImage
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="banner-image"
                />
                <div className="banner-overlay-gradient" />
              </div>

              <div className="banner-content-overlay">
                <span className="banner-eyebrow">
                  <Sparkles />
                  {vi ? "Nổi bật" : "Featured"}
                </span>
                <h2 className="banner-title">{banner.title}</h2>
                {banner.href && (
                  <Link href={banner.href} className="banner-cta-button">
                    <span>{vi ? "Khám phá ngay" : "Explore Now"}</span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            className="banner-nav-btn prev"
            onClick={goToPrev}
            aria-label="Previous Slide"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="banner-nav-btn next"
            onClick={goToNext}
            aria-label="Next Slide"
          >
            <ChevronRight />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {activeBanners.length > 1 && (
        <div className="banner-indicators">
          {activeBanners.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`banner-dot ${index === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
