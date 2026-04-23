# 篮球训练辅助（Web）

战术编辑、JSON 稿校验、简易半场动效预览与分享只读页。生产部署：**腾讯云轻量** + 子域 **basketball.itorange.online**（Nginx 静态 + `/api` 反代 Node）。

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Vite 6、React 19、TypeScript、react-router-dom 7 |
| 后端 | Fastify 5、Drizzle ORM、PostgreSQL（`postgres` 驱动） |
| 共享 | `packages/shared`：Zod 校验战术 JSON v1 |
| 鉴权 | JWT 短期 access + Opaque refresh（SHA-256 存库） |

## 仓库结构

```
basketball_drill/
├── package.json
├── docker-compose.yml          # 本地 PostgreSQL
├── .env.example
├── docs/
├── examples/
│   └── tactic-play.v1.json
├── packages/
│   └── shared/                 # 战术 v1 类型 + Zod
└── apps/
    ├── api/                    # :3001
    │   ├── src/...
    │   └── drizzle.config.ts
    └── web/                    # 开发 :5173，构建产物 dist/
```

## Git

**远程（GitHub）**：`git@github.com:earthturtle2/basketball_drill.git`

```bash
git remote add origin git@github.com:earthturtle2/basketball_drill.git
# 若已存在 origin：git remote set-url origin git@github.com:earthturtle2/basketball_drill.git
git push -u origin main
```

`.env`、各 `dist` 构建目录已列入 `.gitignore`，勿将生产密钥提交进仓库。

**生产机（itorange.online）** 上代码目录为 **`/data/node_app/basketball_drill`**。详见 [docs/deploy-tencent.md](docs/deploy-tencent.md)。

## 本地开发

1. **环境变量**（已复制则跳过）

   ```bash
   cp .env.example .env
   # 若自行修改，至少配置 DATABASE_URL、JWT_ACCESS_SECRET、JWT_REFRESH_SECRET
   ```

2. **数据库**（需本机已装 Docker，可选）

   ```bash
   docker compose up -d
   npm run db:push -w @basketball/api
   ```

   默认 `DATABASE_URL=postgres://basketball:basketball@127.0.0.1:5433/basketball`（与 `docker-compose.yml` 一致）。

3. **联调**

   ```bash
   npm run dev
   ```

   - 前端 <http://localhost:5173>，通过 Vite 代理将 `/api` 转发到 <http://127.0.0.1:3001>。  
   - 注册/登录后创建「战术」；在编辑页可改 **战术 JSON**、半场预览、**生成分享链接**；学员在 `/view/{token}` 只读。

4. **构建**

   ```bash
   npm run build
   ```

## 生产（概要）

- 将 `apps/web/dist` 作为 Nginx 站点根；`location /api/ { proxy_pass http://127.0.0.1:3001; }`（保留 `/api` 路径前缀，与现实现一致）。  
- `PUBLIC_APP_URL=https://basketball.itorange.online`，以便分享链接中的 `viewUrl` 正确。  
- 在服务器上为 `@basketball/api` 配置 `node dist/index.js` 与 `DATABASE_URL` 等。详见 [docs/deploy-tencent.md](./docs/deploy-tencent.md)。

## 文档

- [API 草图](./docs/api.md)  
- [战术 JSON v1 字段说明](./docs/tactic-json-v1.md)  
- [战术 JSON 示例 v1](./examples/tactic-play.v1.json)  
