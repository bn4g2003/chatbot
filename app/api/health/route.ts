import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
export const runtime = "nodejs";
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", database: "connected" });
  } catch {
    return Response.json({ status: "error", database: "disconnected" }, { status: 503 });
  }
}
