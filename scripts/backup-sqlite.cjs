/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync, mkdirSync } = require("node:fs");
const { dirname, isAbsolute, resolve, basename } = require("node:path");
const { config } = require("dotenv");
const Database = require("better-sqlite3");

const repoRoot = resolve(__dirname, "..");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, ".env.local") });
config({ path: resolve(repoRoot, "apps/api/.env") });

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.log("backup-sqlite: DATABASE_URL not set; skipping backup");
  process.exit(0);
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

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

(async () => {
  const dbPath = resolveSqlitePath(raw);
  if (!existsSync(dbPath)) {
    console.log(`backup-sqlite: ${dbPath} does not exist; skipping backup`);
    return;
  }

  const backupDir = resolve(dirname(dbPath), "backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = resolve(backupDir, `${basename(dbPath)}.${timestamp()}.bak`);
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    await db.backup(backupPath);
  } finally {
    db.close();
  }
  console.log(`backup-sqlite: wrote ${backupPath}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
