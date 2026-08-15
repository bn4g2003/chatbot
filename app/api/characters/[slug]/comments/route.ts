import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { characterComments, characters, users } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const [char] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.slug, slug))
    .limit(1);

  if (!char) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: characterComments.id,
      content: characterComments.content,
      rating: characterComments.rating,
      likesCount: characterComments.likesCount,
      createdAt: characterComments.createdAt,
      userName: users.name,
      userImage: users.image,
      userRole: users.role,
    })
    .from(characterComments)
    .innerJoin(users, eq(users.id, characterComments.userId))
    .where(eq(characterComments.characterId, char.id))
    .orderBy(desc(characterComments.createdAt))
    .limit(50);

  return NextResponse.json({ comments: rows });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const [char] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.slug, slug))
    .limit(1);

  if (!char) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const body = await request.json();
  const content = String(body.content || "").trim();
  const rating = Math.max(1, Math.min(5, Number(body.rating || 5)));

  if (!content) {
    return NextResponse.json(
      { error: "Nội dung bình luận không được để trống" },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(characterComments)
    .values({
      characterId: char.id,
      userId: session.user.id,
      content,
      rating,
      likesCount: 0,
    })
    .returning();

  return NextResponse.json({
    comment: {
      ...inserted,
      userName: session.user.name,
      userImage: session.user.image,
      userRole: (session.user as any).role || "user",
    },
  });
}
