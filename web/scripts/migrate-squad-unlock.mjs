import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const confirmProd =
  process.argv.includes("--confirm-production") ||
  process.argv.includes("--confirm-dev") ||
  process.argv.includes("--confirm-remote");

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
if (isRemote && !confirmProd) {
  console.error(
    "SAFETY STOP: TURSO_DATABASE_URL points to a remote database (" +
      url +
      "). Pass --confirm-dev or --confirm-production only when explicitly approved."
  );
  process.exit(1);
}

const client = createClient({ url, authToken: authToken || undefined });

async function migrate() {
  console.log("Running squad_unlock_requests migration on:", url);

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS squad_unlock_requests (
      id TEXT PRIMARY KEY,
      phase INTEGER NOT NULL,
      requested_by TEXT NOT NULL REFERENCES participants(id),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'approved', 'rejected', 'cancelled')),
      responded_by TEXT REFERENCES participants(id),
      responded_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_squad_unlock_requests_phase_status 
    ON squad_unlock_requests(phase, status);
  `);

  console.log("Migration completed successfully: squad_unlock_requests table and index created.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
