import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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

    const fallbackCharacterTranslations = alias(
      characterTranslations,
      "fallback_character_translations",
    );
    const fallbackScenarioTranslations = alias(
      scenarioTranslations,
      "fallback_scenario_translations",
    );

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
        characterSlug: characters.slug,
        characterName: sql<string>`coalesce(${characterTranslations.name}, ${fallbackCharacterTranslations.name}, 'Character')`,
        avatarUrl: sql<string | null>`(
          select ${characterImages.url}
          from ${characterImages}
          where ${characterImages.characterId} = ${conversations.characterId}
          order by case when ${characterImages.type} = 'avatar' then 0 else 1 end, ${characterImages.sortOrder}
          limit 1
        )`,
        scenarioTitle: sql<string>`coalesce(${scenarioTranslations.title}, ${fallbackScenarioTranslations.title}, ${conversations.title}, 'Scenario')`,
      })
      .from(conversations)
      .innerJoin(characters, eq(characters.id, conversations.characterId))
      .leftJoin(
        characterTranslations,
        and(
          eq(characterTranslations.characterId, conversations.characterId),
          eq(characterTranslations.locale, conversations.locale),
        ),
      )
      .leftJoin(
        fallbackCharacterTranslations,
        and(
          eq(fallbackCharacterTranslations.characterId, conversations.characterId),
          eq(fallbackCharacterTranslations.locale, "vi"),
        ),
      )
      .leftJoin(
        scenarioTranslations,
        and(
          eq(scenarioTranslations.scenarioId, conversations.scenarioId),
          eq(scenarioTranslations.locale, conversations.locale),
        ),
      )
      .leftJoin(
        fallbackScenarioTranslations,
        and(
          eq(fallbackScenarioTranslations.scenarioId, conversations.scenarioId),
          eq(fallbackScenarioTranslations.locale, "vi"),
        ),
      )
      .where(and(...whereConditions))
      .orderBy(desc(conversations.updatedAt));

    const conversationIds = userConversations.map((conversation) => conversation.id);
    const [messageCounts, lastMessages] = conversationIds.length
      ? await Promise.all([
          db
            .select({
              conversationId: messages.conversationId,
              count: sql<number>`count(*)::int`,
            })
            .from(messages)
            .where(inArray(messages.conversationId, conversationIds))
            .groupBy(messages.conversationId),
          db
            .selectDistinctOn([messages.conversationId], {
              conversationId: messages.conversationId,
              role: messages.role,
              content: messages.content,
              createdAt: messages.createdAt,
            })
            .from(messages)
            .where(inArray(messages.conversationId, conversationIds))
            .orderBy(messages.conversationId, desc(messages.createdAt)),
        ])
      : [[], []];

    const countsByConversation = new Map(
      messageCounts.map((row) => [row.conversationId, row.count]),
    );
    const lastMessageByConversation = new Map(
      lastMessages.map((row) => [row.conversationId, row]),
    );

    const enriched = userConversations.map((conversation) => {
      const lastMessage = lastMessageByConversation.get(conversation.id);
      return {
        id: conversation.id,
        characterId: conversation.characterId,
        scenarioId: conversation.scenarioId,
        locale: conversation.locale,
        title: conversation.title,
        userPreferredName: conversation.userPreferredName,
        preferredAddress: conversation.preferredAddress,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        character: {
          id: conversation.characterId,
          slug: conversation.characterSlug,
          name: conversation.characterName,
          avatarUrl: conversation.avatarUrl,
        },
        scenario: { title: conversation.scenarioTitle },
        messageCount: countsByConversation.get(conversation.id) ?? 0,
        lastMessage: lastMessage
          ? {
              role: lastMessage.role,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            }
          : null,
      };
    });

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
