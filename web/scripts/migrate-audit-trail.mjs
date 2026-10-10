import crypto from "crypto";
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

function inferCategory(action, entityType) {
  const act = String(action || "").toLowerCase();
  const ent = String(entityType || "").toLowerCase();
  if (act.includes("login") || act.includes("logout") || act.includes("pin") || ent === "security" || ent === "session") {
    return "security";
  }
  if (act.includes("roster") || act.includes("squad") || act.includes("shortlist") || act.includes("card") || ent === "roster_card" || ent === "roster_phase" || ent === "squad_shortlist") {
    return "squad";
  }
  if (act.includes("match") || act.includes("dispute") || act.includes("goal") || act.includes("ballot") || ent === "match" || ent === "dispute" || ent === "goal_nomination" || ent === "award_ballot") {
    return "match";
  }
  if (act.includes("reset") || act.includes("archive") || ent === "reset_request" || ent === "archive") {
    return "mutual";
  }
  return "setup";
}

function computeEntryHash(row, prevHash) {
  const canonicalPayload = JSON.stringify([
    prevHash || "GENESIS",
    String(row.id),
    String(row.actor_id),
    String(row.action),
    String(row.entity_type),
    String(row.entity_id),
    row.before_json ? String(row.before_json) : "",
    row.after_json ? String(row.after_json) : "",
    String(row.reason),
    String(row.timestamp),
  ]);
  return crypto.createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}

async function run() {
  console.log(`Running idempotent Audit Trail & Integrity migration on ${url}...`);

  // 1. Add columns to audit_events
  const auditCols = await getColumns("audit_events");
  await addColIfMissing("audit_events", "category", "TEXT NOT NULL DEFAULT 'setup'", auditCols);
  await addColIfMissing("audit_events", "actor_name", "TEXT", auditCols);
  await addColIfMissing("audit_events", "device_info", "TEXT", auditCols);
  await addColIfMissing("audit_events", "prev_hash", "TEXT", auditCols);
  await addColIfMissing("audit_events", "entry_hash", "TEXT", auditCols);

  // 2. Add last_audit_seen_at to participants
  const partCols = await getColumns("participants");
  await addColIfMissing("participants", "last_audit_seen_at", "TEXT", partCols);

  // 3. Backfill hash chain on any existing audit_events rows that lack entry_hash
  const unhashedCheck = await client.execute(
    "SELECT count(*) as cnt FROM audit_events WHERE entry_hash IS NULL OR prev_hash IS NULL;"
  );
  const unhashedCount = Number(unhashedCheck.rows[0]?.cnt || 0);

  if (unhashedCount > 0) {
    console.log(`Backfilling hash chain for ${unhashedCount} existing audit_events rows...`);
    await client.execute("DROP TRIGGER IF EXISTS trg_audit_events_no_update;");

    const partsRes = await client.execute("SELECT id, display_name FROM participants;");
    const nameMap = {};
    for (const p of partsRes.rows) {
      nameMap[String(p.id)] = String(p.display_name);
    }

    const allEventsRes = await client.execute("SELECT rowid, * FROM audit_events ORDER BY rowid ASC;");
    let prevHash = "GENESIS";

    for (const row of allEventsRes.rows) {
      const cat = inferCategory(row.action, row.entity_type);
      const actorName = row.actor_name ? String(row.actor_name) : nameMap[String(row.actor_id)] || String(row.actor_id);
      const deviceInfo = row.device_info ? String(row.device_info) : "Sistem / Migrasi Awal";
      const entryHash = computeEntryHash(row, prevHash);

      await client.execute({
        sql: `UPDATE audit_events
              SET category = ?, actor_name = ?, device_info = ?, prev_hash = ?, entry_hash = ?
              WHERE id = ?;`,
        args: [cat, actorName, deviceInfo, prevHash, entryHash, String(row.id)],
      });
      prevHash = entryHash;
    }
    console.log(`Hash chain backfilled (${allEventsRes.rows.length} total entries, latest hash: ${prevHash.slice(0, 12)}...).`);
  }

  // 4. Create append-only database triggers (blocks UPDATE and DELETE on audit_events)
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
  console.log("Append-only triggers (trg_audit_events_no_update & trg_audit_events_no_delete) installed.");

  // 5. Indexes for fast filtering on Jejak Audit
  await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id, timestamp DESC);");
  await client.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit_events(category, timestamp DESC);");

  console.log("Audit Trail migration completed successfully.");
}

run().catch((err) => {
  console.error("Audit migration error:", err);
  process.exit(1);
});
