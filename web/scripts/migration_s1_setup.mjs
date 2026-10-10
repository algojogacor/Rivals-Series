import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  console.log("Running idempotent migrations for Rivals Series S1...");

  // 1. Add player_a_color to season_settings
  try {
    await client.execute("ALTER TABLE season_settings ADD COLUMN player_a_color TEXT DEFAULT '#ffb02e';");
    console.log("Added column: player_a_color");
  } catch (err) {
    console.log("Column player_a_color check:", err.message);
  }

  // 2. Add player_b_color to season_settings
  try {
    await client.execute("ALTER TABLE season_settings ADD COLUMN player_b_color TEXT DEFAULT '#3ec9e6';");
    console.log("Added column: player_b_color");
  } catch (err) {
    console.log("Column player_b_color check:", err.message);
  }

  // 3. Create reset_requests table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS reset_requests (
      id TEXT PRIMARY KEY,
      requested_by TEXT NOT NULL REFERENCES participants(id),
      reset_mode TEXT NOT NULL CHECK(reset_mode IN ('results_only', 'total_reset')),
      status TEXT NOT NULL DEFAULT 'pending_approval' CHECK(status IN ('pending_approval', 'approved', 'rejected', 'executed')),
      archive_json TEXT,
      confirmation_phrase TEXT NOT NULL,
      partner_approved_at TEXT,
      partner_rejection_reason TEXT,
      executed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log("Verified table: reset_requests");

  // Ensure season_settings has default colors if null
  await client.execute(`
    UPDATE season_settings 
    SET player_a_color = COALESCE(player_a_color, '#ffb02e'),
        player_b_color = COALESCE(player_b_color, '#3ec9e6')
    WHERE id = 'season_1';
  `);

  const cols = await client.execute("PRAGMA table_info(season_settings);");
  console.log("season_settings columns:", cols.rows.map(r => r.name));

  const settings = await client.execute("SELECT id, status, player_a_color, player_b_color FROM season_settings WHERE id = 'season_1';");
  console.log("Current season settings:", settings.rows);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
