import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  aiUsageLogs,
  conversationStoryStates,
  conversations,
  messages,
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

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
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

const preferencesSchema = z.object({
  userPreferredName: z.string().trim().max(80).optional(),
  preferredAddress: z.string().trim().max(200).optional(),
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
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ error: error.message || "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await context.params;

    // Check conversation exists and belongs to user
    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, id),
        eq(conversations.userId, session.user.id),
      ),
    });

    if (!conv) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Disconnect aiUsageLogs foreign key before deletion
    await db
      .update(aiUsageLogs)
      .set({ conversationId: null })
      .where(eq(aiUsageLogs.conversationId, id));

    const [deleted] = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.user.id),
        ),
      )
      .returning();

    return Response.json({ success: true, message: "Conversation deleted" });
  } catch (error: any) {
    console.error("Delete conversation error:", error);
    if (error?.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(
      { error: error.message || "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
