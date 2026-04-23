# 生产环境部署说明（basketball.itorange.online）

本文档描述在 **itorange.online** 服务器上从 0 到可访问的完整流程，以及与 [scripts/server-release.sh](../scripts/server-release.sh) 一致的**日常发版**。与 `english.*`、`stock.*` 同机时，仅为子域增加独立 Nginx `server` 块。

---

## 一览

| 项 | 值 |
|----|-----|
| 代码目录（仓库根） | `/data/node_apps/basketball_drill`（若你使用 `node-apps` 等路径，下文命令中自行替换） |
| 域名 | `basketball.itorange.online` |
| 前端静态文件 | `…/apps/web/dist`（`npm run build` 生成） |
| API | Node 进程，本机 **`127.0.0.1:3002`**（`PORT=3002`，`HOST=127.0.0.1`） |
| 进程管理 | **PM2**，应用名 `basketball-api`（[ecosystem.config.cjs](../ecosystem.config.cjs)） |
| 数据库 | **SQLite**，`DATABASE_URL` 指向单个 `.db` 文件，需**定期备份**（含同目录 `.db-wal`、`.db-shm` 若存在） |
| 代码仓库 | `git@github.com:earthturtle2/basketball_drill.git` |

---

## 环境要求（首次前检查）

1. **Node.js**：建议 **20+ LTS**（你使用 24 亦可，需能成功编译原生模块）。  
2. **npm 源**：必须能下载依赖。若默认源失败，任选其一：  
   `npm config set registry https://registry.npmjs.org/`  
   或 `https://registry.npmmirror.com`  
   **不要**使用无法解析的 `mirrors.tencentyun.com`（公网常见 `ENOTFOUND`）。  
3. **编译链**（安装 `better-sqlite3`）：如 `build-essential`、`python3`（OpenCloud 等请用对应包名安装）。  
4. **全局 PM2**：`npm i -g pm2`。  
5. **Nginx**：已装，且能配置 SSL（可与其它子域共用证书）。  
6. **DNS**：`basketball.itorange.online` 的 **A 记录** 指向本机公网 IP。

---

## 首次部署（按顺序执行）

以下以 `APP=/data/node_apps/basketball_drill` 为例。

### 1）拉代码

```bash
sudo mkdir -p /data/node_apps
sudo chown -R "$USER":"$USER" /data/node_apps
cd /data/node_apps
git clone git@github.com:earthturtle2/basketball_drill.git basketball_drill
cd basketball_drill
```

### 2）环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少包含（生产示例见 [deploy/.env.production.example](../deploy/.env.production.example)）：

- `DATABASE_URL=file:/data/node_apps/basketball_drill/data/basketball.db`  
- `JWT_ACCESS_SECRET`、`JWT_REFRESH_SECRET`（长随机串）  
- `PUBLIC_APP_URL=https://basketball.itorange.online`  
- `HOST=127.0.0.1`  
- `PORT=3002`  

确保运行 API 的系统用户**可写** `data/` 目录（不存在时应用会创建）。

### 3）安装依赖、构建、建表

```bash
npm ci --no-audit --no-fund
npm run build
npm run db:push -w @basketball/api
```

### 4）PM2 启动 API 并设置开机自启

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
# 按屏幕提示执行一条 sudo 命令
```

自检：

```bash
curl -sS http://127.0.0.1:3002/health
```

应返回含 `ok` 的 JSON。

### 5）Nginx

1. 复制 [deploy/nginx-basketball.itorange.online.conf.example](../deploy/nginx-basketball.itorange.online.conf.example) 为站点配置并修改 **SSL 证书路径**。  
2. **`root`**：`/data/node_apps/basketball_drill/apps/web/dist`  
3. **`location /api/`**：`proxy_pass http://127.0.0.1:3002;`（**不要**写成 `…3002/api/` 等会改路径的写法）  
4. **`location /`**：需 `try_files $uri $uri/ /index.html;`（SPA）  
5. `sudo nginx -t && sudo nginx -s reload`

### 6）浏览器验证

访问 `https://basketball.itorange.online`：能打开页面、可注册/登录即表示前后端与反代基本正常。

---

## 日常发版（已有环境，仅更新代码）

在**仓库根**执行：

```bash
cd /data/node_apps/basketball_drill
git pull
bash scripts/server-release.sh
```

脚本会：`npm ci` → `npm run build` → `db:push` → **PM2 重启** `basketball-api`。  
仅改前端时逻辑相同；若某次 **仅改静态** 也可在 `git pull` 后只 `npm run build` 再按需 `pm2 restart`（无 API 变更时）。

---

## 排错速查

| 现象 | 处理 |
|------|------|
| 502 / 页面空白 API | `pm2 logs basketball-api`；`curl 127.0.0.1:3002/health` |
| 前端路由 404 | Nginx 未配 `try_files … /index.html` |
| API 404 | `proxy_pass` 写错，导致 `/api` 路径被剥掉 |
| SQLite 权限 | 进程用户无法写 `data/*.db` → `chown`/`chmod` |
| `npm ci` 失败、**ENOTFOUND 镜像** | 改 `registry`（见上文「环境要求」）；见 [deploy/.npmrc.example](../deploy/.npmrc.example) |
| `Exit handler never called` / **node-gyp** | 安装 `build-essential`、`python3`；`npm rebuild better-sqlite3 -w @basketball/api` |
| **`Cannot find module @rollup/rollup-linux-x64-gnu`**（`vite build`） | Rollup 可选原生包在 workspace 下被漏装（[npm#4828](https://github.com/npm/cli/issues/4828)）。仓库根已锁 `optionalDependencies`；若在旧目录仍报错：删掉 `node_modules` 与 `package-lock.json` 后重新 `git pull` 再 `npm ci`，且**勿**在 `NODE_ENV=production` 下执行 `npm ci`（见 [server-release.sh](../scripts/server-release.sh)）。**Alpine/musl** 若报 `linux-x64-musl`，可再执行：`npm i @rollup/rollup-linux-x64-musl@4.60.2 -D -w @basketball/web`（版本与 lock 中 rollup 一致）。 |

更细的说明见上文各节及历史排错段落（已并入「排错速查」；若需 **systemd** 替代 PM2，见 [deploy/basketball-api.service.example](../deploy/basketball-api.service.example)）。

---

## 附：从旧版 PostgreSQL 迁出

若早期曾用 PostgreSQL，切换 SQLite 后需**重新注册账号**；旧数据需自行导出/迁移，无自动迁移工具。
