import { getRuntimeEnv, type AppDb } from "@/db";
import { notifications, type Form, type Submission } from "@/db/schema";

type DeliveryResult = {
  channel: "email" | "webhook";
  status: "sent" | "skipped" | "failed";
  error?: string;
};

async function recordNotification(db: AppDb, formId: string, submissionId: string, result: DeliveryResult) {
  if (result.status === "skipped") {
    return;
  }

  await db.insert(notifications).values({
    formId,
    submissionId,
    channel: result.channel,
    status: result.status,
    error: result.error,
  });
}

export async function deliverNotifications(db: AppDb, form: Form, submission: Submission): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];
  const env = getRuntimeEnv();
  const payload = JSON.parse(submission.payload) as Record<string, unknown>;

  if (form.notifyEmail && form.emailTo && env.RESEND_API_KEY && env.RESEND_FROM) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_FROM,
          to: form.emailTo,
          subject: `New ${form.name} submission`,
          text: `FormForge received a new submission for ${form.name}.\n\n${JSON.stringify(payload, null, 2)}`,
        }),
      });

      results.push(
        response.ok
          ? { channel: "email", status: "sent" }
          : { channel: "email", status: "failed", error: await response.text() },
      );
    } catch (error) {
      results.push({ channel: "email", status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  } else {
    results.push({ channel: "email", status: "skipped" });
  }

  if (form.webhookUrl) {
    try {
      const { isPrivateUrl } = await import("./url-validation");
      if (isPrivateUrl(form.webhookUrl)) {
        results.push({ channel: "webhook", status: "failed", error: "SSRF prevention: Webhook URL resolves to a private or internal IP address." });
      } else {
        const response = await fetch(form.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "FormForge/1.0" },
          body: JSON.stringify({ form: { id: form.id, name: form.name }, submission }),
        });

        results.push(
          response.ok
            ? { channel: "webhook", status: "sent" }
            : { channel: "webhook", status: "failed", error: await response.text() },
        );
      }
    } catch (error) {
      results.push({ channel: "webhook", status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  } else {
    results.push({ channel: "webhook", status: "skipped" });
  }

  await Promise.all(results.map((result) => recordNotification(db, form.id, submission.id, result)));
  return results;
}
