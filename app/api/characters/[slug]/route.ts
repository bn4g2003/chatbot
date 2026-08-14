import { getCharacter } from "@/lib/characters";
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params; const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
  const character = await getCharacter(slug, locale); return character ? Response.json(character) : Response.json({ error: "Not found" }, { status: 404 });
}
