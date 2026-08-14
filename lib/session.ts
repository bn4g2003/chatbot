import "server-only";
import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() { return auth.api.getSession({ headers: await headers() }); }
export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") throw new Error("FORBIDDEN");
  return session;
}
