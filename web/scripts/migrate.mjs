import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

function parseSqlStatements(sql) {
  // Strip block comments
  let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  // Strip line comments
  cleaned = cleaned.replace(/--.*$/gm, "");

  const statements = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "'") {
      // Check for escaped single quote in SQL ''
      if (inQuote && i + 1 < cleaned.length && cleaned[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      current += char;
    } else if (char === ";" && !inQuote) {
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  return statements;
}

async function runSqlFile(filePath) {
  console.log(`Executing SQL file: ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, "utf-8");
  const statements = parseSqlStatements(content);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await client.execute(statement);
    } catch (err) {
      console.error(`Error in ${path.basename(filePath)} statement #${i}:\n${statement}\nError:`, err.message);
      throw err;
    }
  }
  console.log(`Finished ${path.basename(filePath)} successfully (${statements.length} statements).`);
}

async function main() {
  try {
    const schemaPath = path.resolve(__dirname, "schema.sql");
    const seedPath = path.resolve(__dirname, "seed.sql");

    await runSqlFile(schemaPath);
    await runSqlFile(seedPath);

    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("Database initialized! Current tables:", tables.rows.map(r => r.name));

    const matchesCount = await client.execute("SELECT count(*) as count FROM matches;");
    console.log("Initialized matches count:", matchesCount.rows[0].count);

    const participants = await client.execute("SELECT id, display_name, is_admin FROM participants;");
    console.log("Initialized participants:", participants.rows);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
