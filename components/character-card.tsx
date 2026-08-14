import Link from "next/link"; import { Eye, MessageCircle } from "lucide-react"; import { RemoteImage } from "./remote-image";
export type CharacterCardData = { id: string; slug: string; name: string; description: string; imageUrl: string | null; views: number | null; chats: number | null; rating: string };
export function CharacterCard({ character, locale, rank }: { character: CharacterCardData; locale: string; rank?: number }) { return <Link className="character-card" href={`/${locale}/characters/${character.slug}`}>
  <div className="card-image">{rank && <b className="rank">{rank}</b>}<RemoteImage src={character.imageUrl} alt={character.name} /></div>
  <div className="card-body"><h3>{character.name}</h3><p>{character.description}</p><div className="card-meta"><span><Eye />{character.views ?? 0}</span><span><MessageCircle />{character.chats ?? 0}</span><span className="rating">{character.rating}</span></div></div>
</Link>; }
