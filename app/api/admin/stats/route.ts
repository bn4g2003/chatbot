import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  aiModelsTable,
  aiUsageLogs,
  apiCredentials,
  characters,
  conversations,
  messages,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const [
      [userCountRow],
      [charCountRow],
      [pendingCountRow],
      [publishedCountRow],
      [convCountRow],
      [msgCountRow],
      [aiStatsRow],
      systemCred,
      defaultModel,
      recentConversations,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(characters),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(characters)
        .where(eq(characters.status, "pending_review")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(characters)
        .where(eq(characters.status, "published")),
      db.select({ count: sql<number>`count(*)::int` }).from(conversations),
      db.select({ count: sql<number>`count(*)::int` }).from(messages),
      db
        .select({
          totalCalls: sql<number>`count(*)::int`,
          successCalls: sql<number>`count(*) filter (where ${aiUsageLogs.successful} = true)::int`,
          totalInputTokens: sql<number>`coalesce(sum(${aiUsageLogs.inputTokens}), 0)::int`,
          totalOutputTokens: sql<number>`coalesce(sum(${aiUsageLogs.outputTokens}), 0)::int`,
        })
        .from(aiUsageLogs),
      db.query.apiCredentials.findFirst({
        where: and(
          eq(apiCredentials.ownerType, "system"),
          eq(apiCredentials.provider, "google"),
        ),
      }),
      db.query.aiModelsTable.findFirst({
        where: eq(aiModelsTable.isDefault, true),
      }),
      db
        .select({
          id: conversations.id,
          title: conversations.title,
          locale: conversations.locale,
          createdAt: conversations.createdAt,
          userEmail: users.email,
          userName: users.name,
        })
        .from(conversations)
        .leftJoin(users, eq(users.id, conversations.userId))
        .orderBy(desc(conversations.createdAt))
        .limit(6),
    ]);

    return Response.json({
      metrics: {
        users: userCountRow?.count ?? 0,
        characters: charCountRow?.count ?? 0,
        pendingCharacters: pendingCountRow?.count ?? 0,
        publishedCharacters: publishedCountRow?.count ?? 0,
        conversations: convCountRow?.count ?? 0,
        messages: msgCountRow?.count ?? 0,
        totalAiCalls: aiStatsRow?.totalCalls ?? 0,
        successAiCalls: aiStatsRow?.successCalls ?? 0,
        totalTokens:
          (aiStatsRow?.totalInputTokens ?? 0) +
          (aiStatsRow?.totalOutputTokens ?? 0),
      },
      system: {
        hasGeminiKey: !!systemCred,
        geminiKeyLastFour: systemCred?.keyLastFour ?? null,
        geminiLastValidatedAt: systemCred?.lastValidatedAt ?? null,
        defaultModel: defaultModel?.modelId ?? "gemini-2.5-flash",
      },
      recentConversations,
    });
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status: 403 }
    );
  }
}
