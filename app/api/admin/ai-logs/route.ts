import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsageLogs, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));

    const logs = await db
      .select({
        id: aiUsageLogs.id,
        modelId: aiUsageLogs.modelId,
        usedPersonalKey: aiUsageLogs.usedPersonalKey,
        inputTokens: aiUsageLogs.inputTokens,
        outputTokens: aiUsageLogs.outputTokens,
        successful: aiUsageLogs.successful,
        errorCode: aiUsageLogs.errorCode,
        createdAt: aiUsageLogs.createdAt,
        userId: aiUsageLogs.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(aiUsageLogs)
      .leftJoin(users, eq(users.id, aiUsageLogs.userId))
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(limit);

    return Response.json({ logs });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
