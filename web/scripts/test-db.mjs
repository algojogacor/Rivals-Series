import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log("Connecting to Turso DB at:", url);

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url,
  authToken,
});

async function main() {
  try {
    const rs = await client.execute("SELECT 1 as connected;");
    console.log("Successfully connected to Turso!", rs.rows);

    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Existing tables:", tables.rows.map(r => r.name));
  } catch (err) {
    console.error("Error connecting to Turso:", err);
    process.exit(1);
  }
}

main();
