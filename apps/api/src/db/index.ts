import "../lib/env.js";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.js";

const raw = process.env.DATABASE_URL;
if (!raw) {
  throw new Error("DATABASE_URL is not set");
}

// dev (tsx):  here = apps/api/src/db  → 4 levels up = repo root
// prod (tsc): here = apps/api/dist/db → 4 levels up = repo root
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");

function resolveSqlitePath(v: string): string {
  if (v.startsWith("file:")) {
    const p = v.slice("file:".length);
    if (isAbsolute(p)) return p;
    return resolve(repoRoot, p);
  }
  if (isAbsolute(v)) return v;
  return resolve(repoRoot, v);
}

const filePath = resolveSqlitePath(raw);
const dir = dirname(filePath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(filePath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

function hasTable(name: string) {
  const row = sqlite
    .prepare("select name from sqlite_master where type = 'table' and name = ?")
    .get(name);
  return Boolean(row);
}

function hasColumn(table: string, column: string) {
  return sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => (c as { name: string }).name === column);
}

sqlite.exec(`
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#e53935',
  players TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);
`);

if (hasTable("teams") && !hasColumn("teams", "players")) {
  sqlite.exec("ALTER TABLE teams ADD COLUMN players TEXT NOT NULL DEFAULT '[]'");
}

if (hasTable("plays") && !hasColumn("plays", "team_id")) {
  sqlite.pragma("foreign_keys = OFF");
  sqlite.exec("ALTER TABLE plays ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE SET NULL");
  sqlite.pragma("foreign_keys = ON");
}

if (hasTable("plays") && !hasColumn("plays", "team_ids")) {
  sqlite.exec("ALTER TABLE plays ADD COLUMN team_ids TEXT NOT NULL DEFAULT '[]'");
}

if (hasTable("plays") && !hasColumn("plays", "library_scope")) {
  sqlite.exec("ALTER TABLE plays ADD COLUMN library_scope TEXT NOT NULL DEFAULT 'all_coaches'");
}

if (hasTable("plays") && !hasColumn("plays", "shared_with_user_ids")) {
  sqlite.exec("ALTER TABLE plays ADD COLUMN shared_with_user_ids TEXT NOT NULL DEFAULT '[]'");
}

sqlite.exec(`
CREATE TABLE IF NOT EXISTS invite_codes (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
`);

export const db = drizzle(sqlite, { schema });
export { schema, sqlite as sqliteDb };
