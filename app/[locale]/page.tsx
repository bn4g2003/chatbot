import { asc, eq } from "drizzle-orm";
import { ArrowRight, Compass, Flame, Search } from "lucide-react";
import { BannerCarousel, BannerItem } from "@/components/banner-carousel";
import { CharacterCard } from "@/components/character-card";
import { listCharacters } from "@/lib/characters";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
  searchParams,
}: PageProps<"/[locale]">) {
  const { locale } = await params;
  const query = (await searchParams).q as string | undefined;

  let trending: Awaited<ReturnType<typeof listCharacters>> = [];
  let newest: typeof trending = [];
  let viewed: typeof trending = [];
  let bannerList: BannerItem[] = [];

  try {
    const [trendingRes, newestRes, viewedRes, dbBanners] = await Promise.all([
      listCharacters(locale, { q: query, sort: "trending", limit: 8 }),
      listCharacters(locale, { sort: "new", limit: 8 }),
      listCharacters(locale, { sort: "views", limit: 8 }),
      db
        .select()
        .from(banners)
        .where(eq(banners.active, true))
        .orderBy(asc(banners.sortOrder)),
    ]);
    trending = trendingRes;
    newest = newestRes;
    viewed = viewedRes;
    bannerList = dbBanners;
  } catch {
    /* Database startup or fallback */
  }

  const vi = locale === "vi";

  return (
    <main className="page-shell">
      {/* Top Banner Carousel */}
      <BannerCarousel banners={bannerList} locale={locale} />

      {/* Search Bar */}
      <div className="home-search-container">
        <form className="home-search-form">
          <Search />
          <input
            name="q"
            defaultValue={query}
            placeholder={
              vi
                ? "Tìm kiếm nhân vật, thế giới hoặc thể loại…"
                : "Search characters, worlds or genres…"
            }
          />
          <button type="submit">{vi ? "Khám phá" : "Explore"}</button>
        </form>
      </div>

      {query && (
        <div className="search-caption">
          {vi ? "Kết quả cho" : "Results for"} “{query}”
        </div>
      )}

      {/* Character Sections */}
      <CharacterSection
        icon={<Flame />}
        title={vi ? "Đang thịnh hành" : "Trending now"}
        subtitle={
          vi
            ? "Những nhân vật được yêu thích tuần này"
            : "Characters loved this week"
        }
        items={trending}
        locale={locale}
        ranked
      />

      <CharacterSection
        icon={<Compass />}
        title={vi ? "Mới bước vào Lorelia" : "New to Lorelia"}
        subtitle={
          vi ? "Những câu chuyện vừa mở cửa" : "Stories that just opened their doors"
        }
        items={newest}
        locale={locale}
      />

      <CharacterSection
        icon={<ArrowRight />}
        title={vi ? "Được khám phá nhiều nhất" : "Most explored"}
        subtitle={
          vi
            ? "Những thế giới có nhiều lượt ghé thăm"
            : "The most visited worlds"
        }
        items={viewed}
        locale={locale}
      />
    </main>
  );
}

function CharacterSection({
  icon,
  title,
  subtitle,
  items,
  locale,
  ranked = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: Awaited<ReturnType<typeof listCharacters>>;
  locale: string;
  ranked?: boolean;
}) {
  return (
    <section className="character-section">
      <div className="section-heading">
        <div>
          <span>{icon}</span>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>
      {items.length ? (
        <div className="card-grid">
          {items.map((item, i) => (
            <CharacterCard
              key={item.id}
              character={item}
              locale={locale}
              rank={ranked ? i + 1 : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {locale === "vi"
            ? "Chưa có nhân vật. Hãy tạo nhân vật đầu tiên trong Creator."
            : "No characters yet. Create the first one in Creator."}
        </div>
      )}
    </section>
  );
}
