import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { plans, quotaEvents, quotaPeriods, userEntitlements } from "./db/schema";

function monthBounds(now = new Date()) { return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) }; }
export async function getQuota(userId: string) {
  const { start, end } = monthBounds();
  let period = await db.query.quotaPeriods.findFirst({ where: and(eq(quotaPeriods.userId, userId), gte(quotaPeriods.periodStart, start), lt(quotaPeriods.periodStart, end)) });
  if (!period) {
    const entitlement = await db.select({ allowance: plans.monthlyMessages }).from(userEntitlements).innerJoin(plans, eq(userEntitlements.planId, plans.id)).where(eq(userEntitlements.userId, userId)).limit(1);
    const allowance = entitlement[0]?.allowance ?? 30;
    [period] = await db.insert(quotaPeriods).values({ userId, periodStart: start, periodEnd: end, allowance }).onConflictDoNothing().returning();
    period ??= await db.query.quotaPeriods.findFirst({ where: and(eq(quotaPeriods.userId, userId), eq(quotaPeriods.periodStart, start)) });
  }
  if (!period) throw new Error("QUOTA_UNAVAILABLE"); return period;
}
export async function consumeQuota(userId: string, reason: string) {
  const period = await getQuota(userId);
  const [updated] = await db.update(quotaPeriods).set({ used: sql`${quotaPeriods.used} + 1`, updatedAt: new Date() }).where(and(eq(quotaPeriods.id, period.id), lt(quotaPeriods.used, quotaPeriods.allowance))).returning();
  if (!updated) throw new Error("QUOTA_EXCEEDED");
  await db.insert(quotaEvents).values({ quotaPeriodId: period.id, type: "usage", amount: 1, reason }); return updated;
}
