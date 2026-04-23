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

/** 与 drizzle.config 一致：file: 相对路径相对 monorepo 根目录 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

export const db = drizzle(sqlite, { schema });
export { schema, sqlite as sqliteDb };
