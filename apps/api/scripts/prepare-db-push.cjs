/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync, mkdirSync } = require("node:fs");
const { dirname, isAbsolute, resolve } = require("node:path");
const { config } = require("dotenv");
const Database = require("better-sqlite3");

const repoRoot = resolve(__dirname, "../../..");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, ".env.local") });

const raw = process.env.DATABASE_URL;
if (!raw) {
  throw new Error("DATABASE_URL is required, e.g. file:./data/basketball.db");
}

function resolveSqlitePath(value) {
  if (value.startsWith("file:")) {
    const p = value.slice("file:".length);
    return isAbsolute(p) ? p : resolve(repoRoot, p);
  }
  return isAbsolute(value) ? value : resolve(repoRoot, value);
}

const dbPath = resolveSqlitePath(raw);
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// These are non-unique performance indexes. Older deployments may have created
// them before drizzle-kit tracked the schema, so dropping them before `push`
// avoids "index already exists"; drizzle-kit recreates the current definitions.
const managedIndexes = [
  "idx_refresh_user",
  "idx_invite_codes_created_by",
  "idx_teams_user",
  "idx_plays_user",
  "idx_plays_user_updated",
  "idx_shares_play",
];

for (const indexName of managedIndexes) {
  db.prepare(`DROP INDEX IF EXISTS ${indexName}`).run();
}

db.close();
