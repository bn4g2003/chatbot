import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  plans,
  quotaEvents,
  quotaPeriods,
  userEntitlements,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const patchUserSchema = z.object({
  role: z.enum(["user", "creator", "admin"]).optional(),
  banned: z.boolean().optional(),
  planId: z.string().uuid().optional(),
  addQuota: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { id } = await route.params;
    const input = patchUserSchema.parse(await request.json());

    // Prevent admin from banning or demoting themselves directly
    if (adminSession.user.id === id) {
      if (input.banned === true) {
        return Response.json(
          { error: "Cannot ban your own admin account" },
          { status: 400 }
        );
      }
      if (input.role && input.role !== "admin") {
        return Response.json(
          { error: "Cannot remove your own admin role" },
          { status: 400 }
        );
      }
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Update user fields
    const userUpdates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.role) userUpdates.role = input.role;
    if (typeof input.banned === "boolean") userUpdates.banned = input.banned;

    await db.update(users).set(userUpdates).where(eq(users.id, id));

    // Update plan if requested
    if (input.planId) {
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });
      if (plan) {
        await db
          .insert(userEntitlements)
          .values({ userId: id, planId: input.planId })
          .onConflictDoUpdate({
            target: userEntitlements.userId,
            set: { planId: input.planId, updatedAt: new Date() },
          });
      }
    }

    // Add extra quota if requested
    if (input.addQuota && input.addQuota !== 0) {
      const currentQuota = await db.query.quotaPeriods.findFirst({
        where: eq(quotaPeriods.userId, id),
      });
      if (currentQuota) {
        await db
          .update(quotaPeriods)
          .set({
            allowance: Math.max(0, currentQuota.allowance + input.addQuota),
            updatedAt: new Date(),
          })
          .where(eq(quotaPeriods.id, currentQuota.id));

        await db.insert(quotaEvents).values({
          quotaPeriodId: currentQuota.id,
          type: "adjustment",
          amount: input.addQuota,
          reason: `Admin adjustment by ${adminSession.user.email}`,
          actorId: adminSession.user.id,
        });
      }
    }

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return Response.json({ user: updatedUser });
  } catch (e: any) {
    return Response.json({ error: e.message || "Forbidden or invalid" }, { status: 403 });
  }
}
