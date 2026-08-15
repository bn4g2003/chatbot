import { and, desc, eq, sql } from "drizzle-orm";
import { getCharacterContext } from "@/lib/characters";
import { db } from "@/lib/db";
import {
  characterImages,
  characterTranslations,
  characters,
  conversationStoryStates,
  conversations,
  messages,
  scenarioTranslations,
  storyEvents,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import {
  createInitialStoryState,
  storyStateColumns,
} from "@/lib/story-director";
import { createConversationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("characterId");

    const whereConditions = [eq(conversations.userId, session.user.id)];
    if (characterId) {
      whereConditions.push(eq(conversations.characterId, characterId));
    }

    const userConversations = await db
      .select({
        id: conversations.id,
        characterId: conversations.characterId,
        scenarioId: conversations.scenarioId,
        locale: conversations.locale,
        title: conversations.title,
        userPreferredName: conversations.userPreferredName,
        preferredAddress: conversations.preferredAddress,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(and(...whereConditions))
      .orderBy(desc(conversations.updatedAt));

    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        // Character info
        const char = await db.query.characters.findFirst({
          where: eq(characters.id, conv.characterId),
        });

        const charTrans = await db
          .select()
          .from(characterTranslations)
          .where(eq(characterTranslations.characterId, conv.characterId));
        const localizedChar =
          charTrans.find((t) => t.locale === conv.locale) ||
          charTrans.find((t) => t.locale === "vi") ||
          charTrans[0];

        const charImg = await db.query.characterImages.findFirst({
          where: eq(characterImages.characterId, conv.characterId),
        });

        // Scenario info
        const scTrans = await db
          .select()
          .from(scenarioTranslations)
          .where(eq(scenarioTranslations.scenarioId, conv.scenarioId));
        const localizedSc =
          scTrans.find((t) => t.locale === conv.locale) ||
          scTrans.find((t) => t.locale === "vi") ||
          scTrans[0];

        // Message count and last message
        const [msgCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(eq(messages.conversationId, conv.id));

        const lastMsg = await db.query.messages.findFirst({
          where: eq(messages.conversationId, conv.id),
          orderBy: desc(messages.createdAt),
        });

        return {
          ...conv,
          character: {
            id: char?.id,
            slug: char?.slug,
            name: localizedChar?.name || "Character",
            avatarUrl: charImg?.url || null,
          },
          scenario: {
            title: localizedSc?.title || conv.title || "Scenario",
          },
          messageCount: msgCount?.count ?? 0,
          lastMessage: lastMsg
            ? {
                role: lastMsg.role,
                content: lastMsg.content,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      })
    );

    return Response.json({ conversations: enriched });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "Unauthorized"
            : "Invalid request",
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

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = createConversationSchema.parse(await request.json());
    const context = await getCharacterContext(
      input.characterId,
      input.scenarioId,
      input.locale,
    );
    if (!context)
      return Response.json(
        { error: "Character or scenario not found" },
        { status: 404 },
      );
    const scenario = input.customScenario ?? context.scenarioTranslation;
    const initialStoryState = createInitialStoryState({
      scenarioGoal: scenario.goal,
      scenarioDescription: scenario.description,
      location: scenario.location,
      time: scenario.time,
    });
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        characterId: input.characterId,
        scenarioId: input.scenarioId,
        locale: input.locale,
        title: scenario.title,
        customScenario: input.customScenario ?? null,
        userPreferredName: input.userPreferredName || null,
        preferredAddress: input.preferredAddress || null,
      })
      .returning();
    await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: "assistant",
        content: scenario.openingMessage,
      });
    await db
      .insert(conversationStoryStates)
      .values({
        conversationId: conversation.id,
        ...storyStateColumns(initialStoryState),
      });
    await db.insert(storyEvents).values({
      conversationId: conversation.id,
      decision: "hold",
      confidence: 1,
      reason: "Initial story beat created from the selected scenario.",
      signals: [],
      stateBefore: initialStoryState,
      stateAfter: initialStoryState,
    });
    return Response.json({ id: conversation.id }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHORIZED"
            ? "Unauthorized"
            : "Invalid request",
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
