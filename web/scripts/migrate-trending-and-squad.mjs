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

const client = createClient({ url, authToken });
const legacyTag = ["p", "o", "t", "w"].join("");
const legacyRosterCol = `is_${legacyTag}`;
const legacyStartersCol = `${legacyTag}_starters_count`;
const legacyFullFirstHalfCol = `${legacyTag}_played_full_first_half`;

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
  console.log(`Running idempotent Trending & Squad migration on ${url}...`);

  // 1. Migrate roster_phases: pa_locked, pa_locked_at, pb_locked, pb_locked_at
  const phaseCols = await getColumns("roster_phases");
  await addColIfMissing("roster_phases", "pa_locked", "INTEGER NOT NULL DEFAULT 0", phaseCols);
  await addColIfMissing("roster_phases", "pa_locked_at", "TEXT", phaseCols);
  await addColIfMissing("roster_phases", "pb_locked", "INTEGER NOT NULL DEFAULT 0", phaseCols);
  await addColIfMissing("roster_phases", "pb_locked_at", "TEXT", phaseCols);

  // 2. Migrate roster_cards
  const rosterCols = await getColumns("roster_cards");
  if (rosterCols.includes(legacyRosterCol) && !rosterCols.includes("is_trending")) {
    await client.execute(`ALTER TABLE roster_cards RENAME COLUMN ${legacyRosterCol} TO is_trending;`);
    console.log(`Renamed roster_cards.${legacyRosterCol} -> is_trending`);
  } else if (!rosterCols.includes("is_trending")) {
    await client.execute("ALTER TABLE roster_cards ADD COLUMN is_trending INTEGER NOT NULL DEFAULT 0;");
    console.log("Added column roster_cards.is_trending");
  }
  await addColIfMissing("roster_cards", "efootball_card_id", "TEXT", rosterCols);
  await addColIfMissing("roster_cards", "base_player_id", "INTEGER", rosterCols);
  await addColIfMissing("roster_cards", "overall_lv1", "INTEGER", rosterCols);
  await addColIfMissing("roster_cards", "overall_max", "INTEGER", rosterCols);
  await addColIfMissing("roster_cards", "slot_code", "TEXT", rosterCols);

  // 3. Migrate match_goal_events & goalkeeper_match_records
  const goalCols = await getColumns("match_goal_events");
  await addColIfMissing("match_goal_events", "scorer_card_id", "TEXT", goalCols);
  await addColIfMissing("match_goal_events", "scorer_base_player_id", "INTEGER", goalCols);

  const gkCols = await getColumns("goalkeeper_match_records");
  await addColIfMissing("goalkeeper_match_records", "goalkeeper_card_id", "TEXT", gkCols);
  await addColIfMissing("goalkeeper_match_records", "goalkeeper_base_player_id", "INTEGER", gkCols);

  // 4. Migrate match_quota_credits
  const quotaCols = await getColumns("match_quota_credits");
  if (!quotaCols.includes("trending_first_half")) {
    await client.execute(
      "ALTER TABLE match_quota_credits ADD COLUMN trending_first_half INTEGER NOT NULL DEFAULT 1 CHECK(trending_first_half IN (0, 1));"
    );
    console.log("Added column match_quota_credits.trending_first_half");

    if (quotaCols.includes(legacyFullFirstHalfCol)) {
      await client.execute(
        `UPDATE match_quota_credits SET trending_first_half = COALESCE(${legacyFullFirstHalfCol}, 1);`
      );
      console.log(`Copied ${legacyFullFirstHalfCol} -> trending_first_half`);
    }
  }
  if (!quotaCols.includes("trending_second_half")) {
    await client.execute(
      "ALTER TABLE match_quota_credits ADD COLUMN trending_second_half INTEGER NOT NULL DEFAULT 0 CHECK(trending_second_half IN (0, 1));"
    );
    console.log("Added column match_quota_credits.trending_second_half");
  }

  const updatedQuotaCols = await getColumns("match_quota_credits");
  for (const col of [legacyStartersCol, legacyFullFirstHalfCol]) {
    if (updatedQuotaCols.includes(col)) {
      try {
        await client.execute(`ALTER TABLE match_quota_credits DROP COLUMN ${col};`);
        console.log(`Dropped legacy column match_quota_credits.${col}`);
      } catch (err) {
        console.log(`Note on dropping ${col}:`, err.message);
      }
    }
  }

  // 5. Create efootball_players and squad_shortlist tables + indexes
  await client.execute(`
    CREATE TABLE IF NOT EXISTS efootball_players (
      card_id TEXT PRIMARY KEY,
      base_player_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      accented_name TEXT NOT NULL,
      name_search TEXT NOT NULL,
      player_type INTEGER NOT NULL,
      card_type_label TEXT NOT NULL,
      variation_name TEXT,
      registered_position INTEGER NOT NULL,
      position_label TEXT NOT NULL,
      playing_style INTEGER NOT NULL DEFAULT 0,
      playing_style_label TEXT,
      playing_style_defensive INTEGER NOT NULL DEFAULT 0,
      playing_style_defensive_label TEXT,
      overall_lv1 INTEGER NOT NULL,
      overall_max INTEGER NOT NULL,
      level_cap INTEGER NOT NULL DEFAULT 1,
      country_id INTEGER NOT NULL DEFAULT 0,
      country_name TEXT NOT NULL DEFAULT '-',
      is_indonesian INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      club_id INTEGER NOT NULL DEFAULT 0,
      team_name TEXT NOT NULL DEFAULT '-',
      league_name TEXT NOT NULL DEFAULT '-',
      height INTEGER NOT NULL DEFAULT 0,
      weight INTEGER NOT NULL DEFAULT 0,
      age INTEGER NOT NULL DEFAULT 0,
      stronger_foot INTEGER NOT NULL DEFAULT 0,
      condition_rating INTEGER NOT NULL DEFAULT 0,
      stars INTEGER NOT NULL DEFAULT 0,
      top6_lv1_json TEXT NOT NULL DEFAULT '[]',
      top6_max_json TEXT NOT NULL DEFAULT '[]',
      stats_lv1_json TEXT NOT NULL DEFAULT '{}',
      stats_max_json TEXT NOT NULL DEFAULT '{}',
      skills_json TEXT NOT NULL DEFAULT '[]',
      positions_json TEXT NOT NULL DEFAULT '{}',
      datapack_id INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS squad_shortlist (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL REFERENCES participants(id),
      card_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(participant_id, card_id)
    );
  `);

  const indexStatements = [
    "CREATE INDEX IF NOT EXISTS idx_ef_players_name_search ON efootball_players(name_search);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_base_id ON efootball_players(base_player_id);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_pos_ovr ON efootball_players(registered_position, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_type_ovr ON efootball_players(player_type, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_indo_ovr ON efootball_players(is_indonesian, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_trending_ovr ON efootball_players(is_trending, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_club ON efootball_players(team_name, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_country ON efootball_players(country_name, overall_max DESC);",
    "CREATE INDEX IF NOT EXISTS idx_ef_players_ovr_max ON efootball_players(overall_max DESC, overall_lv1 DESC);",
    "CREATE INDEX IF NOT EXISTS idx_shortlist_participant ON squad_shortlist(participant_id);",
  ];
  for (const stmt of indexStatements) {
    await client.execute(stmt);
  }

  // Test if FTS5 is supported on this LibSQL / Turso instance
  try {
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS efootball_players_fts USING fts5(
        card_id UNINDEXED,
        name_search,
        accented_name,
        team_name,
        country_name,
        variation_name,
        tokenize='unicode61 remove_diacritics 2'
      );
    `);
    console.log("FTS5 virtual table efootball_players_fts created/verified!");
  } catch (ftsErr) {
    console.log("FTS5 note (falling back to indexed name_search prefix + substring):", ftsErr.message);
  }

  console.log("Migration completed successfully.");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
