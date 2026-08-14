import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  characters,
  conversations,
  plans,
  quotaPeriods,
  userEntitlements,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const role = searchParams.get("role");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const whereConditions = [];

    if (q) {
      whereConditions.push(
        or(
          ilike(users.name, `%${q}%`),
          ilike(users.email, `%${q}%`)
        )
      );
    }

    if (role && ["user", "creator", "admin"].includes(role)) {
      whereConditions.push(eq(users.role, role as "user" | "creator" | "admin"));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        banned: users.banned,
        createdAt: users.createdAt,
        planName: plans.name,
        planSlug: plans.slug,
        planId: plans.id,
      })
      .from(users)
      .leftJoin(userEntitlements, eq(userEntitlements.userId, users.id))
      .leftJoin(plans, eq(plans.id, userEntitlements.planId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Get character count and conversation count for each user
    const usersWithStats = await Promise.all(
      userRows.map(async (u) => {
        const [charCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(characters)
          .where(eq(characters.ownerId, u.id));

        const [convCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(conversations)
          .where(eq(conversations.userId, u.id));

        const currentQuota = await db.query.quotaPeriods.findFirst({
          where: eq(quotaPeriods.userId, u.id),
          orderBy: desc(quotaPeriods.periodStart),
        });

        return {
          ...u,
          characterCount: charCount?.count ?? 0,
          conversationCount: convCount?.count ?? 0,
          quota: currentQuota
            ? {
                allowance: currentQuota.allowance,
                used: currentQuota.used,
                periodEnd: currentQuota.periodEnd,
              }
            : null,
        };
      })
    );

    return Response.json({
      users: usersWithStats,
      pagination: {
        total: totalRow?.count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((totalRow?.count ?? 0) / limit),
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden" }, { status: 403 });
  }
}
