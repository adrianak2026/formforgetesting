import { and, desc, eq, sql } from "drizzle-orm";
import { databaseUnavailableResponse, getDb, isDbReady } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { forms, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ formId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const db = getDb();
  if (!isDbReady(db)) {
    return databaseUnavailableResponse();
  }

  await ensureSchema(db);

  const user = await getCurrentUser(request, db);
  if (!user) {
    return jsonError("UNAUTHENTICATED", "Sign in to view submissions.", 401);
  }

  const { formId } = await context.params;
  const formRows = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.userId, user.id)))
    .limit(1);

  if (!formRows[0]) {
    return jsonError("FORM_NOT_FOUND", "Form not found.", 404);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  try {
    // Query total count for pagination
    const countResult = await db
      .select({ count: eq(submissions.formId, formId) ? sql<number>`count(*)` : sql<number>`0` })
      .from(submissions)
      .where(eq(submissions.formId, formId));
    
    const total = countResult[0]?.count ?? 0;

    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.formId, formId))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);

    return jsonOk({ submissions: rows, pagination: { limit, offset, total } });
  } catch (error) {
    return jsonError("DB_ERROR", "Failed to retrieve submissions.", 500);
  }
}
