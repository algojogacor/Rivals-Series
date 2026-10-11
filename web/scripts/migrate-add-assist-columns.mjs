import fs from 'fs';
import { createClient } from '@libsql/client';

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const urlMatch = env.match(/TURSO_DATABASE_URL=([^\r\n]+)/);
const tokenMatch = env.match(/TURSO_AUTH_TOKEN=([^\r\n]+)/);

const url = process.env.TURSO_DATABASE_URL || (urlMatch ? urlMatch[1].replace(/['"]/g, '').trim() : '');
const authToken = process.env.TURSO_AUTH_TOKEN || (tokenMatch ? tokenMatch[1].replace(/['"]/g, '').trim() : '');

if (!url) {
  console.error('Missing TURSO_DATABASE_URL');
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
  } else {
    console.log(`Column ${table}.${col} already exists (skipped).`);
  }
}

export async function runMigration(customClient = client) {
  console.log(`Checking/migrating match_goal_events assist columns on database...`);
  const existingCols = await getColumns('match_goal_events');

  await addColIfMissing('match_goal_events', 'assist_player_name', 'TEXT', existingCols);
  await addColIfMissing('match_goal_events', 'assist_card_id', 'TEXT', existingCols);
  await addColIfMissing('match_goal_events', 'assist_base_player_id', 'INTEGER', existingCols);
  await addColIfMissing('match_goal_events', 'assist_card_version', 'TEXT', existingCols);

  console.log('Migration finished successfully!');
}

// Run directly if executed as main module
if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, '/')) {
  runMigration().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
