import { and, asc, desc, eq } from "drizzle-orm";
import { createAiClient } from "@/lib/ai";
import { getCharacterContext } from "@/lib/characters";
import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import {
  aiModelsTable,
  aiUsageLogs,
  apiCredentials,
  conversationMemories,
  conversationStoryStates,
  conversations,
  messages,
  storyEvents,
} from "@/lib/db/schema";
import { buildRoleplayPrompt, recentMessages } from "@/lib/prompt";
import { consumeQuota, getQuota } from "@/lib/quota";
import { requireSession } from "@/lib/session";
import {
  directStoryTurn,
  holdDirection,
  storyDirectionPrompt,
  type StoryState,
} from "@/lib/story-director";
import { sendMessageSchema } from "@/lib/validation";

const encoder = new TextEncoder();
function event(type: string, data: unknown) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(
  request: Request,
  route: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await route.params;
    const input = sendMessageSchema.parse(await request.json());
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.user.id),
        ),
      )
      .limit(1);
    if (!conversation)
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    const [locked] = await db
      .update(conversations)
      .set({ generating: true })
      .where(and(eq(conversations.id, id), eq(conversations.generating, false)))
      .returning();
    if (!locked)
      return Response.json(
        { error: "A response is already being generated" },
        { status: 409 },
      );

    const personal = await db.query.apiCredentials.findFirst({
      where: and(
        eq(apiCredentials.ownerType, "user"),
        eq(apiCredentials.userId, session.user.id),
        eq(apiCredentials.provider, "google"),
        eq(apiCredentials.active, true),
      ),
    });
    const system = personal
      ? null
      : await db.query.apiCredentials.findFirst({
          where: and(
            eq(apiCredentials.ownerType, "system"),
            eq(apiCredentials.provider, "google"),
            eq(apiCredentials.active, true),
          ),
        });
    const credential = personal ?? system;
    if (!credential) {
      await db
        .update(conversations)
        .set({ generating: false })
        .where(eq(conversations.id, id));
      return Response.json(
        { error: "No Gemini API key is configured" },
        { status: 422 },
      );
    }
    if (!personal) {
      const quota = await getQuota(session.user.id);
      if (quota.used >= quota.allowance) {
        await db
          .update(conversations)
          .set({ generating: false })
          .where(eq(conversations.id, id));
        return Response.json(
          { error: "Monthly chat quota exceeded" },
          { status: 429 },
        );
      }
    }

    const character = await getCharacterContext(
      conversation.characterId,
      conversation.scenarioId,
      conversation.locale,
    );
    if (!character) {
      await db
        .update(conversations)
        .set({ generating: false })
        .where(eq(conversations.id, id));
      return Response.json(
        { error: "Character context is incomplete" },
        { status: 422 },
      );
    }
    const [userMessage] = await db
      .insert(messages)
      .values({ conversationId: id, role: "user", content: input.content })
      .returning({ id: messages.id });
    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    const memory = await db.query.conversationMemories.findFirst({
      where: eq(conversationMemories.conversationId, id),
      orderBy: [desc(conversationMemories.version)],
    });
    const model = await db.query.aiModelsTable.findFirst({
      where: and(
        eq(aiModelsTable.active, true),
        eq(aiModelsTable.isDefault, true),
      ),
    });
    const client = createAiClient({
      modelId: model?.modelId ?? "gemini-3.5-flash-lite",
      apiKey: decryptSecret(credential.encryptedKey),
    });
    const storedStoryState = await db.query.conversationStoryStates.findFirst({
      where: eq(conversationStoryStates.conversationId, id),
    });
    const storyState: StoryState = storedStoryState
      ? {
          turnCount: storedStoryState.turnCount,
          phase: storedStoryState.phase,
          tension: storedStoryState.tension,
          momentum: storedStoryState.momentum,
          trust: storedStoryState.trust,
          affinity: storedStoryState.affinity,
          conflict: storedStoryState.conflict,
          currentLocation: storedStoryState.currentLocation,
          currentTime: storedStoryState.currentTime,
          openThreads: storedStoryState.openThreads,
          establishedFacts: storedStoryState.establishedFacts,
          lastTransitionTurn: storedStoryState.lastTransitionTurn,
          calmTurns: storedStoryState.calmTurns,
          version: storedStoryState.version,
        }
      : {
          turnCount: 0,
          phase: "opening",
          tension: 10,
          momentum: 0,
          trust: 0,
          affinity: 0,
          conflict: 0,
          currentLocation: character.scenarioTranslation.location,
          currentTime: character.scenarioTranslation.time,
          openThreads: [character.scenarioTranslation.goal],
          establishedFacts: [],
          lastTransitionTurn: 0,
          calmTurns: 0,
          version: 1,
        };
    let storyDirection;
    try {
      storyDirection = await directStoryTurn({
        client,
        state: storyState,
        recentMessages: history,
        scenarioGoal: character.scenarioTranslation.goal,
      });
    } catch {
      storyDirection = holdDirection(
        storyState,
        "Director analysis failed; preserve the current scene.",
      );
    }
    const systemPrompt = buildRoleplayPrompt({
      name: character.translation.name,
      locale: conversation.locale,
      biography: character.translation.biography,
      persona: character.persona,
      scenario: character.scenarioTranslation,
      memory: memory?.summary,
      userPreferredName: conversation.userPreferredName,
      preferredAddress: conversation.preferredAddress,
      storyDirection: storyDirectionPrompt(storyDirection),
    });

    const stream = new ReadableStream({
      async start(controller) {
        let output = "";
        controller.enqueue(event("start", { conversationId: id }));
        try {
          for await (const delta of client.streamText({
            system: systemPrompt,
            messages: recentMessages(history),
          })) {
            output += delta;
            controller.enqueue(event("delta", { text: delta }));
          }
          const [saved] = await db
            .insert(messages)
            .values({ conversationId: id, role: "assistant", content: output })
            .returning({ id: messages.id });
          await db.transaction(async (tx) => {
            const after = storyDirection.after;
            await tx
              .insert(conversationStoryStates)
              .values({ conversationId: id, ...after })
              .onConflictDoUpdate({
                target: conversationStoryStates.conversationId,
                set: { ...after, updatedAt: new Date() },
              });
            await tx
              .insert(storyEvents)
              .values({
                conversationId: id,
                sourceMessageId: userMessage.id,
                decision: storyDirection.decision,
                confidence: storyDirection.confidence,
                reason: storyDirection.reason,
                signals: storyDirection.signals,
                stateBefore: storyDirection.before,
                stateAfter: storyDirection.after,
              });
          });
          if (history.length >= 36 && history.length % 12 === 0) {
            await db.insert(conversationMemories).values({
              conversationId: id,
              version: (memory?.version ?? 0) + 1,
              throughMessageId: saved.id,
              summary: {
                recentEvents: [
                  ...history.slice(-11),
                  { role: "assistant", content: output },
                ]
                  .map((item) => `${item.role}: ${item.content}`)
                  .join("\n")
                  .slice(0, 12000),
                relationshipState:
                  "Preserve established promises, emotions, locations, and possessions from these events.",
              },
            });
          }
          if (!personal)
            await consumeQuota(session.user.id, `conversation:${id}`);
          await db.insert(aiUsageLogs).values({
            userId: session.user.id,
            conversationId: id,
            modelId: model?.modelId ?? "gemini-3.5-flash-lite",
            usedPersonalKey: Boolean(personal),
            successful: true,
          });
          controller.enqueue(event("usage", { quotaCharged: !personal }));
          controller.enqueue(event("done", { messageId: saved.id }));
        } catch (error) {
          await db.insert(aiUsageLogs).values({
            userId: session.user.id,
            conversationId: id,
            modelId: model?.modelId ?? "gemini-3.5-flash-lite",
            usedPersonalKey: Boolean(personal),
            successful: false,
            errorCode: "generation_failed",
          });
          controller.enqueue(
            event("error", {
              message:
                error instanceof Error ? error.message : "Generation failed",
            }),
          );
        } finally {
          await db
            .update(conversations)
            .set({ generating: false, updatedAt: new Date() })
            .where(eq(conversations.id, id));
          controller.close();
        }
      },
      cancel() {
        void db
          .update(conversations)
          .set({ generating: false })
          .where(eq(conversations.id, id));
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
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
