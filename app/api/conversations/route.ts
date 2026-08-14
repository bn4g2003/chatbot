import { db } from "@/lib/db";
import {
  conversations,
  conversationStoryStates,
  messages,
} from "@/lib/db/schema";
import { getCharacterContext } from "@/lib/characters";
import { requireSession } from "@/lib/session";
import { createConversationSchema } from "@/lib/validation";
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
    const [conversation] = await db
      .insert(conversations)
      .values({
        userId: session.user.id,
        characterId: input.characterId,
        scenarioId: input.scenarioId,
        locale: input.locale,
        title: context.scenarioTranslation.title,
        userPreferredName: input.userPreferredName || null,
        preferredAddress: input.preferredAddress || null,
      })
      .returning();
    await db
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: "assistant",
        content: context.scenarioTranslation.openingMessage,
      });
    await db
      .insert(conversationStoryStates)
      .values({
        conversationId: conversation.id,
        currentLocation: context.scenarioTranslation.location,
        currentTime: context.scenarioTranslation.time,
        openThreads: [context.scenarioTranslation.goal],
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
