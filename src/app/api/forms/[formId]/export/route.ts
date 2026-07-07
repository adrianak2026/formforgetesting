import { and, desc, eq } from "drizzle-orm";
import { databaseUnavailableResponse, getDb, isDbReady } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { forms, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { csvEscape, jsonError } from "@/lib/http";

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
    return jsonError("UNAUTHENTICATED", "Sign in to export submissions.", 401);
  }

  const { formId } = await context.params;
  const formRows = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.userId, user.id)))
    .limit(1);
  const form = formRows[0];

  if (!form) {
    return jsonError("FORM_NOT_FOUND", "Form not found.", 404);
  }

  try {
    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.formId, formId))
      .orderBy(desc(submissions.createdAt))
      .limit(5000); // Guard memory limit — prevents worker crashes on large databases

    const header = ["id", "created_at", "status", "spam_score", "email", "referer", "payload"];
    const csv = [
      header.map(csvEscape).join(","),
      ...rows.map((row) =>
        [row.id, row.createdAt, row.status, row.spamScore, row.email ?? "", row.referer ?? "", row.payload]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${form.slug}-submissions.csv"`,
      },
    });
  } catch (error) {
    return jsonError("INTERNAL_ERROR", "An error occurred while generating CSV export.", 500);
  }
}
