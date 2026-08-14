import { CharacterCard } from "@/components/character-card";
import { listCharacters } from "@/lib/characters";
import { ArrowRight, Compass, Flame, Search, Sparkles } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function HomePage({ params, searchParams }: PageProps<"/[locale]">) {
  const { locale } = await params; const query = (await searchParams).q as string | undefined;
  let trending: Awaited<ReturnType<typeof listCharacters>> = [], newest: typeof trending = [], viewed: typeof trending = [];
  try { [trending, newest, viewed] = await Promise.all([listCharacters(locale, { q: query, sort: "trending", limit: 8 }), listCharacters(locale, { sort: "new", limit: 8 }), listCharacters(locale, { sort: "views", limit: 8 })]); } catch { /* Database startup is reported by /api/health. */ }
  const vi = locale === "vi";
  return <main className="page-shell">
    <section className="hero"><div className="hero-content"><span className="eyebrow"><Sparkles />{vi ? "Mỗi nhân vật, một thế giới" : "Every character, a world"}</span><h1>{vi ? "Câu chuyện không chỉ để đọc." : "Stories are no longer just read."}<br/><em>{vi ? "Hãy bước vào trong đó." : "Step inside them."}</em></h1><p>{vi ? "Khám phá nhân vật, chọn bối cảnh và tạo nên cuộc hội thoại chỉ thuộc về bạn." : "Discover characters, choose a setting, and create a conversation that belongs to you."}</p><form className="hero-search"><Search/><input name="q" defaultValue={query} placeholder={vi ? "Tìm nhân vật, thế giới hoặc thể loại…" : "Search characters, worlds or genres…"}/><button>{vi ? "Khám phá" : "Explore"}</button></form></div><div className="hero-orb"><span>L</span></div></section>
    {query && <div className="search-caption">{vi ? "Kết quả cho" : "Results for"} “{query}”</div>}
    <CharacterSection icon={<Flame/>} title={vi ? "Đang thịnh hành" : "Trending now"} subtitle={vi ? "Những nhân vật được yêu thích tuần này" : "Characters loved this week"} items={trending} locale={locale} ranked />
    <CharacterSection icon={<Compass/>} title={vi ? "Mới bước vào Lorelia" : "New to Lorelia"} subtitle={vi ? "Những câu chuyện vừa mở cửa" : "Stories that just opened their doors"} items={newest} locale={locale} />
    <CharacterSection icon={<ArrowRight/>} title={vi ? "Được khám phá nhiều nhất" : "Most explored"} subtitle={vi ? "Những thế giới có nhiều lượt ghé thăm" : "The most visited worlds"} items={viewed} locale={locale} />
  </main>;
}
function CharacterSection({ icon, title, subtitle, items, locale, ranked = false }: { icon: React.ReactNode; title: string; subtitle: string; items: Awaited<ReturnType<typeof listCharacters>>; locale: string; ranked?: boolean }) { return <section className="character-section"><div className="section-heading"><div><span>{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div></div>{items.length ? <div className="card-grid">{items.map((item, i) => <CharacterCard key={item.id} character={item} locale={locale} rank={ranked ? i + 1 : undefined}/>)}</div> : <div className="empty-state">{locale === "vi" ? "Chưa có nhân vật. Hãy tạo nhân vật đầu tiên trong Creator." : "No characters yet. Create the first one in Creator."}</div>}</section>; }
