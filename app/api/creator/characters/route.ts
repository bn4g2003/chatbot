import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  characterImages,
  characterPersonas,
  characterScenarios,
  characterTranslations,
  characters,
  plans,
  scenarioTranslations,
  userEntitlements,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { createCharacterSchema } from "@/lib/validation";
function slugify(name: string) {
  return `${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
}
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const entitlement = await db
      .select({ canCreate: plans.canCreateCharacters })
      .from(userEntitlements)
      .innerJoin(plans, eq(plans.id, userEntitlements.planId))
      .where(eq(userEntitlements.userId, session.user.id))
      .limit(1);
    if (session.user.role !== "admin" && !entitlement[0]?.canCreate)
      return Response.json(
        { error: "Your plan cannot create characters" },
        { status: 403 },
      );
    const input = createCharacterSchema.parse(await request.json());
    const result = await db.transaction(async (tx) => {
      const [character] = await tx
        .insert(characters)
        .values({
          slug: slugify(input.name),
          ownerId: session.user.id,
          originalLocale: input.locale,
          rating: input.rating,
        })
        .returning();
      await tx
        .insert(characterTranslations)
        .values({
          characterId: character.id,
          locale: input.locale,
          name: input.name,
          shortDescription: input.shortDescription,
          description: input.description,
          biography: input.biography,
        });
      await tx.insert(characterImages).values([
        {
          characterId: character.id,
          url: input.coverUrl,
          type: "cover",
          sortOrder: 0,
          altText: input.name,
        },
        {
          characterId: character.id,
          url: input.avatarUrl,
          type: "avatar",
          sortOrder: 0,
          altText: input.name,
        },
        ...input.galleryUrls.map((url, index) => ({
          characterId: character.id,
          url,
          type: "gallery" as const,
          sortOrder: index,
          altText: input.name,
        })),
      ]);
      await tx
        .insert(characterPersonas)
        .values({
          characterId: character.id,
          canon: input.canon,
          personality: input.personality,
          motivations: input.motivations,
          fears: input.fears,
          likes: input.likes,
          weaknesses: input.weaknesses,
          relationships: input.relationships,
          speechStyle: input.speechStyle,
          vocabulary: input.vocabulary,
          addressStyle: input.addressStyle,
          expressionHabits: input.expressionHabits,
          knowledge: input.knowledge,
          unknowns: input.unknowns,
          boundaries: input.boundaries,
          exampleDialogue: input.exampleDialogue,
        });
      const [scenario] = await tx
        .insert(characterScenarios)
        .values({ characterId: character.id })
        .returning();
      await tx
        .insert(scenarioTranslations)
        .values({
          scenarioId: scenario.id,
          locale: input.locale,
          ...input.scenario,
        });
      return character;
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "Unauthorized"
            : "Invalid character data",
      },
      {
        status:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? 401
            : 400,
      },
    );
  }
}
