import { databaseUnavailableResponse, getDb, isDbReady } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { clearSessionCookie, deleteCurrentSession } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const db = getDb();
  if (!isDbReady(db)) {
    return databaseUnavailableResponse();
  }

  await ensureSchema(db);
  await deleteCurrentSession(request, db);
  return jsonOk({ signedOut: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
}
