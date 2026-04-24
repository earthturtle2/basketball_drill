import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// dev (tsx):  here = apps/api/src/lib  → 4 levels up = repo root
// prod (tsc): here = apps/api/dist/lib → 4 levels up = repo root
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const apiRoot = resolve(repoRoot, "apps/api");

config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, ".env.local") });
config({ path: resolve(apiRoot, ".env") });

function req(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env: ${name}`);
  return v;
}

export const env = {
  databaseUrl: req("DATABASE_URL"),
  jwtAccessSecret: req("JWT_ACCESS_SECRET"),
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:5173",
  port: Number(process.env.PORT ?? 3002),
  host: process.env.HOST ?? "0.0.0.0",
};
