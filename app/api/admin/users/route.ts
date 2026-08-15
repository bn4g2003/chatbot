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

    const [[totalRow], userRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
      db
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
          characterCount: sql<number>`(
            select count(*)::int from ${characters}
            where ${characters.ownerId} = ${users.id}
          )`,
          conversationCount: sql<number>`(
            select count(*)::int from ${conversations}
            where ${conversations.userId} = ${users.id}
          )`,
          quotaAllowance: sql<number | null>`(
            select ${quotaPeriods.allowance} from ${quotaPeriods}
            where ${quotaPeriods.userId} = ${users.id}
            order by ${quotaPeriods.periodStart} desc limit 1
          )`,
          quotaUsed: sql<number | null>`(
            select ${quotaPeriods.used} from ${quotaPeriods}
            where ${quotaPeriods.userId} = ${users.id}
            order by ${quotaPeriods.periodStart} desc limit 1
          )`,
          quotaPeriodEnd: sql<Date | null>`(
            select ${quotaPeriods.periodEnd} from ${quotaPeriods}
            where ${quotaPeriods.userId} = ${users.id}
            order by ${quotaPeriods.periodStart} desc limit 1
          )`,
        })
        .from(users)
        .leftJoin(userEntitlements, eq(userEntitlements.userId, users.id))
        .leftJoin(plans, eq(plans.id, userEntitlements.planId))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const usersWithStats = userRows.map(
      ({ quotaAllowance, quotaUsed, quotaPeriodEnd, ...user }) => ({
        ...user,
        quota:
          quotaAllowance !== null && quotaUsed !== null && quotaPeriodEnd
            ? {
                allowance: quotaAllowance,
                used: quotaUsed,
                periodEnd: quotaPeriodEnd,
              }
            : null,
      }),
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
  } catch (error: unknown) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Forbidden" },
      { status: 403 }
    );
  }
}
