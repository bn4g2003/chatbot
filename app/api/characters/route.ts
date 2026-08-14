import { listCharacters } from "@/lib/characters";
export async function GET(request: Request) {
  const url = new URL(request.url); const locale = url.searchParams.get("locale") === "en" ? "en" : "vi";
  const sortValue = url.searchParams.get("sort"); const sort = sortValue === "views" || sortValue === "new" ? sortValue : "trending";
  return Response.json({ characters: await listCharacters(locale, { q: url.searchParams.get("q") ?? undefined, sort }) });
}
