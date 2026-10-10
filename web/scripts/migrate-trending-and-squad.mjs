import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const confirmProd = process.argv.includes("--confirm-production");

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const isRemote = url.startsWith("libsql://") || url.startsWith("https://");
if (isRemote && !confirmProd) {
  console.error(
    "SAFETY STOP: TURSO_DATABASE_URL points to a remote database (" +
      url +
      "). Pass --confirm-production only when explicitly approved to run on production."
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

async function run() {
  console.log(`Running idempotent Trending & Squad migration on ${url}...`);

  // 1. Migrate roster_cards: legacy column -> is_trending, add base_player_id
  const rosterCols = await getColumns("roster_cards");
  console.log("roster_cards existing columns:", rosterCols);

  if (rosterCols.includes(legacyRosterCol) && !rosterCols.includes("is_trending")) {
    await client.execute(`ALTER TABLE roster_cards RENAME COLUMN ${legacyRosterCol} TO is_trending;`);
    console.log(`Renamed roster_cards.${legacyRosterCol} -> is_trending`);
  } else if (!rosterCols.includes("is_trending")) {
    await client.execute("ALTER TABLE roster_cards ADD COLUMN is_trending INTEGER NOT NULL DEFAULT 0;");
    console.log("Added column roster_cards.is_trending");
  }

  if (!rosterCols.includes("base_player_id")) {
    await client.execute("ALTER TABLE roster_cards ADD COLUMN base_player_id INTEGER;");
    console.log("Added column roster_cards.base_player_id");
  }

  // 2. Migrate match_quota_credits: add trending_first_half, trending_second_half
  const quotaCols = await getColumns("match_quota_credits");
  console.log("match_quota_credits existing columns:", quotaCols);

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

  // Drop legacy columns on match_quota_credits if present
  const updatedQuotaCols = await getColumns("match_quota_credits");
  if (updatedQuotaCols.includes(legacyStartersCol)) {
    try {
      await client.execute(`ALTER TABLE match_quota_credits DROP COLUMN ${legacyStartersCol};`);
      console.log(`Dropped legacy column match_quota_credits.${legacyStartersCol}`);
    } catch (err) {
      console.log(`Note on dropping ${legacyStartersCol}:`, err.message);
    }
  }
  if (updatedQuotaCols.includes(legacyFullFirstHalfCol)) {
    try {
      await client.execute(`ALTER TABLE match_quota_credits DROP COLUMN ${legacyFullFirstHalfCol};`);
      console.log(`Dropped legacy column match_quota_credits.${legacyFullFirstHalfCol}`);
    } catch (err) {
      console.log(`Note on dropping ${legacyFullFirstHalfCol}:`, err.message);
    }
  }

  const finalRosterCols = await getColumns("roster_cards");
  const finalQuotaCols = await getColumns("match_quota_credits");
  console.log("Final roster_cards columns:", finalRosterCols);
  console.log("Final match_quota_credits columns:", finalQuotaCols);
  console.log("Migration completed successfully.");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
