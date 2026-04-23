# @basketball/api

- **开发**：`npm run dev`（从仓库根用 `npm run dev` 会同时起 web+api，或 `npm run dev -w @basketball/api`）
- **数据库**：SQLite（`better-sqlite3`），`DATABASE_URL` 如 `file:./data/basketball.db`；Drizzle `push` 见 [drizzle.config.ts](./drizzle.config.ts)。
- **生产**：`npm run build` 后由 PM2 跑 `apps/api/dist/index.js`（见根目录 `ecosystem.config.cjs`）；监听 `PORT`（默认 3002）。
