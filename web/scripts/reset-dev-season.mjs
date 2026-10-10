import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const hasConfirmDev = process.argv.includes("--confirm-dev");
const hasConfirmProd = process.argv.includes("--confirm-production");

if (!url) {
  console.error("ERROR: Missing TURSO_DATABASE_URL");
  process.exit(1);
}

// Strict Production Safety Guard:
// This script is strictly for resetting DEV from zero and MUST NEVER run against production.
if (
  hasConfirmProd ||
  process.env.NODE_ENV === "production" ||
  /prod/i.test(url)
) {
  console.error(
    "SAFETY STOP: reset-dev-season.mjs is strictly forbidden on production databases (" +
      url +
      "). Aborting."
  );
  process.exit(1);
}

if (!hasConfirmDev) {
  console.error(
    "SAFETY STOP: Pass --confirm-dev explicitly to reset the development season database (" +
      url +
      ")."
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
  console.log(`Starting zero-state DEV season reset on ${url}...`);

  // 1. Verify efootball_players count BEFORE reset (must remain untouched)
  const beforePlayersRes = await client.execute(
    "SELECT count(*) as cnt FROM efootball_players;"
  );
  const beforePlayersCount = Number(beforePlayersRes.rows[0]?.cnt || 0);
  console.log(`eFootball lookup table before reset: ${beforePlayersCount.toLocaleString("id-ID")} cards`);

  // 2. Ensure schema has all equal-account & invite columns/tables
  const partCols = await getColumns("participants");
  await addColIfMissing("participants", "pin_hash", "TEXT", partCols);
  await addColIfMissing("participants", "pin_updated_at", "TEXT", partCols);
  await addColIfMissing("participants", "profile_completed", "INTEGER NOT NULL DEFAULT 0", partCols);
  await addColIfMissing("participants", "failed_login_attempts", "INTEGER NOT NULL DEFAULT 0", partCols);
  await addColIfMissing("participants", "locked_until", "TEXT", partCols);
  await addColIfMissing("participants", "last_audit_seen_at", "TEXT", partCols);

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

  // 3. Temporarily drop append-only triggers on audit_events so DEV zero-reset can clear audit_events
  await client.execute("DROP TRIGGER IF EXISTS trg_audit_events_no_update;");
  await client.execute("DROP TRIGGER IF EXISTS trg_audit_events_no_delete;");

  // 4. Wipe all season data (NEVER touching efootball_players or efootball_players_fts!)
  const wipeStatements = [
    "DELETE FROM match_goal_events;",
    "DELETE FROM goalkeeper_match_records;",
    "DELETE FROM match_quota_credits;",
    "DELETE FROM connection_incidents;",
    "DELETE FROM disputes;",
    "DELETE FROM sanctions;",
    "DELETE FROM goal_nominations;",
    "DELETE FROM award_ballots;",
    "DELETE FROM reset_requests;",
    "DELETE FROM regulations_amendments;",
    "DELETE FROM squad_shortlist;",
    "DELETE FROM roster_cards;",
    "DELETE FROM roster_phases;",
    "DELETE FROM matches;",
    "DELETE FROM season_invites;",
    "DELETE FROM audit_events;",
    "DELETE FROM season_settings;",
    "DELETE FROM participants;",
  ];

  for (const sql of wipeStatements) {
    await client.execute(sql);
  }

  // 5. Re-seed clean zero-state records for Setup mode
  await client.execute(`
    INSERT INTO participants (
      id, display_name, monogram, is_admin, pin_hash, pin_updated_at,
      profile_completed, failed_login_attempts, locked_until, last_audit_seen_at
    ) VALUES
      ('participant_a', 'Pemain A', 'PA', 0, NULL, NULL, 0, 0, NULL, NULL),
      ('participant_b', 'Pemain B', 'PB', 0, NULL, NULL, 0, 0, NULL, NULL);
  `);

  await client.execute(`
    INSERT INTO season_settings (
      id, season_name, game_title, status, total_matchdays,
      match_duration_minutes, player_condition, max_substitutions, max_sub_windows,
      current_roster_phase, player_a_color, player_b_color
    ) VALUES (
      'season_1', 'Rivals Series Season 1', 'eFootball™ Friend Match 1v1, Dream Team',
      'setup', 20, 8, 'Random', 6, 6, 1, '#ffb02e', '#3ec9e6'
    );
  `);

  await client.execute(`
    INSERT INTO roster_phases (phase, label, is_locked, pa_locked, pb_locked)
    VALUES
      (1, 'Fase 1 (MD1-MD10)', 0, 0, 0),
      (2, 'Fase 2 (MD11-MD20)', 0, 0, 0);
  `);

  for (let md = 1; md <= 20; md++) {
    const phase = md <= 10 ? "group_stage" : "knockout_stage";
    await client.execute({
      sql: `INSERT INTO matches (
              id, md_number, phase, status, result_type,
              home_participant_id, away_participant_id, confirmation_status
            ) VALUES (?, ?, ?, 'scheduled', 'normal', 'participant_a', 'participant_b', 'pending');`,
      args: [`MD${md}`, md, phase],
    });
  }

  // 6. Re-install append-only triggers on audit_events immediately
  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_update
    BEFORE UPDATE ON audit_events
    BEGIN
      SELECT RAISE(ABORT, 'Jejak audit bersifat tambah-saja (append-only): perubahan data dilarang');
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS trg_audit_events_no_delete
    BEFORE DELETE ON audit_events
    BEGIN
      SELECT RAISE(ABORT, 'Jejak audit bersifat tambah-saja (append-only): penghapusan data dilarang');
    END;
  `);

  // 7. Verify efootball_players count AFTER reset
  const afterPlayersRes = await client.execute(
    "SELECT count(*) as cnt FROM efootball_players;"
  );
  const afterPlayersCount = Number(afterPlayersRes.rows[0]?.cnt || 0);

  console.log(`eFootball lookup table after reset: ${afterPlayersCount.toLocaleString("id-ID")} cards`);
  if (afterPlayersCount !== beforePlayersCount) {
    throw new Error("CRITICAL: efootball_players count changed during reset!");
  }

  console.log("DEV season reset to zero ('setup' mode) completed successfully!");
}

run().catch((err) => {
  console.error("Reset DEV season error:", err);
  process.exit(1);
});
