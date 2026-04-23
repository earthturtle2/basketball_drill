# @basketball/api

- **开发**：`npm run dev`（从仓库根用 `npm run dev` 会同时起 web+api，或 `npm run dev -w @basketball/api`）
- **数据库**：Drizzle `push` 与 [drizzle.config.ts](./drizzle.config.ts) 使用根目录 `.env` 的 `DATABASE_URL`。
- **生产**：`npm run build` 后由 PM2 跑 `apps/api/dist/index.js`（见根目录 `ecosystem.config.cjs`）；监听 `PORT`（默认 3002）。
