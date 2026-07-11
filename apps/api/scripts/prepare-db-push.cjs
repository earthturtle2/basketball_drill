/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync, mkdirSync } = require("node:fs");
const { dirname, isAbsolute, resolve } = require("node:path");
const { config } = require("dotenv");
const Database = require("better-sqlite3");

const repoRoot = resolve(__dirname, "../../..");
const apiRoot = resolve(repoRoot, "apps/api");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, ".env.local") });
config({ path: resolve(apiRoot, ".env") });

const raw = process.env.DATABASE_URL;
if (!raw) {
  throw new Error("DATABASE_URL is required, e.g. file:./data/basketball.db");
}

function resolveSqlitePath(value) {
  if (value.startsWith("file:")) {
    const p = value.slice("file:".length);
    return isAbsolute(p) ? p : resolve(repoRoot, p);
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw new Error(`Unsupported DATABASE_URL scheme for SQLite: ${value.split(":")[0]}`);
  }
  return isAbsolute(value) ? value : resolve(repoRoot, value);
}

const dbPath = resolveSqlitePath(raw);
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

function hasTable(name) {
  return Boolean(
    db.prepare("select name from sqlite_master where type = 'table' and name = ?").get(name),
  );
}

function hasColumn(table, column) {
  return db
    .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
    .all()
    .some((entry) => entry.name === column);
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

if (hasTable("users") && !hasColumn("users", "auth_version")) {
  db.exec("ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0");
  console.log(`prepare-db-push: added users.auth_version on ${dbPath}`);
}

// Older deployments may have created indexes before drizzle-kit tracked the
// schema, which can make `push` fail with "index already exists". Drop all
// indexes owned by tables managed in schema.ts; drizzle-kit recreates them.
const managedTables = new Set([
  "refresh_tokens",
  "password_reset_tokens",
  "invite_codes",
  "teams",
  "plays",
  "tactic_categories",
  "play_shares",
  "match_preparations",
  "match_prep_shares",
]);

const managedIndexes = db
  .prepare(
    `SELECT name, tbl_name
     FROM sqlite_master
     WHERE type = 'index'
       AND name NOT LIKE 'sqlite_autoindex_%'`,
  )
  .all()
  .filter(
    (row) =>
      managedTables.has(row.tbl_name) &&
      (row.name.startsWith("idx_") || row.name === "uniq_tactic_categories_user_name"),
  );

for (const row of managedIndexes) {
  db.prepare(`DROP INDEX IF EXISTS ${quoteIdent(row.name)}`).run();
}

if (managedIndexes.length > 0) {
  console.log(
    `prepare-db-push: dropped legacy indexes on ${dbPath}: ${managedIndexes
      .map((row) => row.name)
      .join(", ")}`,
  );
}

db.close();
