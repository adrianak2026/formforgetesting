# 🛠️ FormForge Production Troubleshooting & Setup Guide

This guide helps you resolve any runtime, setup, or pipeline issues when deploying or using FormForge on Cloudflare.

---

## 1. Deploy Setup Prompts

When deploying to Cloudflare using the **Deploy to Cloudflare** button, you must define the following variables on the configuration screen:

| Input Field | Required | Description / Action |
| :--- | :--- | :--- |
| **APP_NAME** | Optional | Name of your deployment (Default: `FormForge`). |
| **AUTH_SECRET** | ✅ Yes | Generate a strong secret key (32+ chars) using [jwtsecrets.com](https://jwtsecrets.com) to secure dashboard sessions. |
| **RESEND_API_KEY** | Optional | Your Resend.com API key. Leave blank if you don't need email alerts. |

---

## 2. Common Errors & Fixes

### ❌ Error: `Network error. Is the Worker deployed and D1 bound?`

#### Cause:
The backend database has no tables created yet, or the database binding is missing.

#### Fix:
1. Open your **Cloudflare Dashboard** -> **D1 Database** -> Select `formforge-db`.
2. Go to the **Console** tab.
3. Paste the following SQL query and click **Execute**:

```sql
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_seen_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "forms" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"endpoint_id" text NOT NULL,
	"description" text,
	"redirect_url" text,
	"success_message" text DEFAULT 'Thanks! Your response has been received.' NOT NULL,
	"allowed_origins" text DEFAULT '*' NOT NULL,
	"honeypot_field" text DEFAULT 'website' NOT NULL,
	"require_proof_of_work" integer DEFAULT false NOT NULL,
	"notify_email" integer DEFAULT false NOT NULL,
	"email_to" text,
	"webhook_url" text,
	"store_ip_hash" integer DEFAULT true NOT NULL,
	"is_active" integer DEFAULT true NOT NULL,
	"submissions_count" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "forms_user_id_idx" ON "forms" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "forms_endpoint_id_idx" ON "forms" ("endpoint_id");
CREATE UNIQUE INDEX IF NOT EXISTS "forms_user_slug_idx" ON "forms" ("user_id","slug");

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"payload" text NOT NULL,
	"email" text,
	"ip_hash" text,
	"user_agent" text,
	"referer" text,
	"status" text DEFAULT 'accepted' NOT NULL,
	"spam_score" integer DEFAULT 0 NOT NULL,
	"spam_reasons" text DEFAULT '[]' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "submissions_form_id_idx" ON "submissions" ("form_id");
CREATE INDEX IF NOT EXISTS "submissions_created_at_idx" ON "submissions" ("created_at");

CREATE TABLE IF NOT EXISTS "form_fields" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"form_id" text NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"required" integer DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "form_fields_form_id_idx" ON "form_fields" ("form_id");
CREATE UNIQUE INDEX IF NOT EXISTS "form_fields_form_key_idx" ON "form_fields" ("form_id","field_key");

CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text DEFAULT 'forms:read,submissions:read' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_used_at" text,
	"revoked_at" text,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_hash_idx" ON "api_keys" ("key_hash");

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"form_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON UPDATE no action ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "notifications_form_id_idx" ON "notifications" ("form_id");
CREATE INDEX IF NOT EXISTS "notifications_submission_id_idx" ON "notifications" ("submission_id");

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"user_id" text,
	"form_id" text,
	"action" text NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE no action ON DELETE set null,
	FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_form_id_idx" ON "audit_logs" ("form_id");

CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

---

### ❌ Error: `Build failed: ERESOLVE could not resolve peer dependencies`

#### Cause:
Node packages installation conflicts.

#### Fix:
Verify that the `.npmrc` file is in the project root with the following line:
```text
legacy-peer-deps=true
```

---

### ❌ Error: `ERROR Could not find compiled Open Next config`

#### Cause:
Wrangler is calling standard compile sequences instead of OpenNext.

#### Fix:
Ensure that `wrangler.toml` contains the custom build script path:
```toml
[build]
command = "opennextjs-cloudflare build"
```

---

## 3. Operations Support

- 🔒 **Zero Paid Services**: D1 Database and Workers scale completely under Cloudflare free plans.
- 📋 **Owner-Only Register**: Registration closes automatically after the first user signs up.
