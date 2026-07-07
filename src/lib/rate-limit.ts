import type { AppDb } from "@/db";
import { sql } from "drizzle-orm";
import { rateLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function checkRateLimit(
  db: AppDb,
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000).toISOString();

  // Get existing rate limit entry
  const existing = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  const entry = existing[0];

  if (!entry || new Date(entry.resetAt) <= now) {
    // No entry or window expired — create/reset
    await db.insert(rateLimits)
      .values({ key, count: 1, resetAt, updatedAt: now.toISOString() })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, resetAt, updatedAt: now.toISOString() },
      });
    return { allowed: true, remaining: maxAttempts - 1, resetAt };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // Increment count
  await db.update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1`, updatedAt: now.toISOString() })
    .where(eq(rateLimits.key, key));

  return { allowed: true, remaining: maxAttempts - entry.count - 1, resetAt: entry.resetAt };
}

export function rateLimitResponse(resetAt: string) {
  return Response.json(
    { ok: false, code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)) } }
  );
}
