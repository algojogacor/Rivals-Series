import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const confirmAllowed =
  process.argv.includes("--confirm-dev") ||
  process.argv.includes("--confirm-production") ||
  process.argv.includes("--confirm-remote");

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
if (isRemote && !confirmAllowed) {
  console.error(
    "SAFETY STOP: TURSO_DATABASE_URL points to a remote database (" +
      url +
      "). Pass --confirm-dev or --confirm-production only when explicitly approved."
  );
  process.exit(1);
}

const client = createClient({ url, authToken });

async function getColumns(tableName) {
  const res = await client.execute(`PRAGMA table_info(${tableName});`);
  return res.rows.map((r) => String(r.name));
}

async function addColIfMissing(table, col, colDef, existingCols) {
  if (!existingCols.includes(col)) {
    await client.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${colDef};`);
    console.log(`Added column ${table}.${col}`);
  }
}

async function run() {
  console.log(`Running idempotent Equal Accounts & Invites migration on ${url}...`);

  // 1. Add PIN hash, profile_completed, and rate limit columns to participants
  const partCols = await getColumns("participants");
  await addColIfMissing("participants", "pin_hash", "TEXT", partCols);
  await addColIfMissing("participants", "pin_updated_at", "TEXT", partCols);
  await addColIfMissing("participants", "profile_completed", "INTEGER NOT NULL DEFAULT 0", partCols);
  await addColIfMissing("participants", "failed_login_attempts", "INTEGER NOT NULL DEFAULT 0", partCols);
  await addColIfMissing("participants", "locked_until", "TEXT", partCols);

  // Equalize peer roles: clear permanent admin flag
  await client.execute("UPDATE participants SET is_admin = 0;");

  // 2. Create season_invites table for one-time second player setup links
  await client.execute(`
    CREATE TABLE IF NOT EXISTS season_invites (
      id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL REFERENCES participants(id),
      target_participant_id TEXT NOT NULL REFERENCES participants(id),
      token_hash TEXT NOT NULL UNIQUE,
      code_hint TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'used', 'expired', 'revoked')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await client.execute("CREATE INDEX IF NOT EXISTS idx_season_invites_token ON season_invites(token_hash);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_season_invites_status ON season_invites(status);");

  console.log("Equal Accounts & Invites migration completed successfully.");
}

run().catch((err) => {
  console.error("Equal Accounts migration error:", err);
  process.exit(1);
});
