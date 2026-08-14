import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  conversationStoryStates,
  conversations,
  messages,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
      ),
    });
    if (!conversation)
      return Response.json({ error: "Not found" }, { status: 404 });
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt));
    const storyState = await db.query.conversationStoryStates.findFirst({
      where: eq(conversationStoryStates.conversationId, id),
    });
    return Response.json({ conversation, messages: history, storyState });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const preferencesSchema = z.object({
  userPreferredName: z.string().trim().max(80),
  preferredAddress: z.string().trim().max(200),
});
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const input = preferencesSchema.parse(await request.json());
    const [conversation] = await db
      .update(conversations)
      .set({
        userPreferredName: input.userPreferredName || null,
        preferredAddress: input.preferredAddress || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.user.id),
        ),
      )
      .returning();
    return conversation
      ? Response.json(conversation)
      : Response.json({ error: "Not found" }, { status: 404 });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
