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
