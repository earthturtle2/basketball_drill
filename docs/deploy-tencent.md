# basketball.itorange.online 云上部署（itorange.online 主机）

与同机 `english.itorange.online`、`stock.itorange.online` 并列，在 Nginx 里为子域新启一个 `server` 块即可，不动其它站点。

## 1. 准备

- **主机**：`itorange.online` 上代码目录 **`/data/node_apps/basketball_drill`**（仓库根）。  
- **代码仓库**：`git@github.com:earthturtle2/basketball_drill.git`  
- **数据库**：**SQLite**（`better-sqlite3`），库文件由 `DATABASE_URL` 指定，默认如 `file:/data/node_apps/basketball_drill/data/basketball.db`。请**定期备份该文件**（含 `-wal` / `-shm` 若存在）。  
- **进程管理**：**PM2**，API 监听 **`127.0.0.1:3002`**。  
- **DNS**：`A` 记录 `basketball` → 与现有子域可相同公网 IP。  
- **本机/服务器**：Node.js 20+、Nginx；全局安装 PM2：`npm i -g pm2`。  
- 若 `npm install` 时编译 `better-sqlite3` 失败，需安装构建链（如 `build-essential`、`python3`），或按该包文档处理。

## 2. 获取代码

```bash
sudo mkdir -p /data/node_apps
sudo chown -R "$USER":"$USER" /data/node_apps
cd /data/node_apps
git clone git@github.com:earthturtle2/basketball_drill.git basketball_drill
cd basketball_drill
```

若目录已存在：`cd /data/node_apps/basketball_drill && git pull`。

## 3. 环境与数据库

1. 复制并编辑环境变量（**勿把真实 .env 提交到 git**）：

   ```bash
   cp .env.example .env
   # 或参考 deploy/.env.production.example
   ```

2. 设置 `DATABASE_URL`（示例）：

   ```bash
   DATABASE_URL=file:/data/node_apps/basketball_drill/data/basketball.db
   ```

   应用会在父目录不存在时自动创建 `data/`；**请保证运行进程的用户对该路径可写**。

3. 生产建议：`HOST=127.0.0.1`，`PORT=3002`，`PUBLIC_APP_URL=https://basketball.itorange.online`。

4. 安装与建表：

   ```bash
   npm ci
   npm run build
   npm run db:push -w @basketball/api
   ```

## 4. PM2 启动 API

在 **仓库根**（与 `ecosystem.config.cjs` 同级）：

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
# 按 pm2 startup 提示执行一条 sudo 命令，保证重启后自启
```

- 进程名：`basketball-api`。  
- 探活：`curl -sS http://127.0.0.1:3002/health`  
- 日志：`pm2 logs basketball-api`

## 5. 前端静态目录

构建后前端在 **`/data/node_apps/basketball_drill/apps/web/dist/`**。Nginx 的 `root` 直接指向该路径。可选 `WEB_OUT` 见 [scripts/server-release.sh](../scripts/server-release.sh)。

## 6. Nginx

1. 参考 [deploy/nginx-basketball.itorange.online.conf.example](../deploy/nginx-basketball.itorange.online.conf.example)，`root` 为 **`/data/node_apps/basketball_drill/apps/web/dist`**。  
2. `location /api/` 使用 `proxy_pass http://127.0.0.1:3002;`（**无 URI 尾缀**）。  
3. 配置 SSL 后 `nginx -t` 并 `reload`。

## 7. 发版小抄

在服务器 **仓库根** `/data/node_apps/basketball_drill`：

```bash
git pull
bash scripts/server-release.sh
```

## 8. 排错

- **502 / 无响应**：`pm2 logs basketball-api`；确认 `PORT=3002`。  
- **数据库权限**：确认 PM2/运行用户可读写 `data/*.db`；必要时 `chown` / `chmod`。  
- **404 子路由**：`location /` 需 `try_files $uri $uri/ /index.html;`。  
- **API 404**：勿使用会剥去 `/api` 前缀的 `proxy_pass` 写法。  
- **`npm error Exit handler never called!`**：多为 npm 与 **原生依赖编译**（`better-sqlite3` 需 node-gyp）时子进程异常退出。处理顺序建议：  
  1. 安装构建依赖（Debian/Ubuntu 示例）：`apt-get install -y build-essential python3`；  
  2. 使用 **Node 20+ LTS**，并升级 npm：`npm install -g npm@10`；  
  3. 在仓库根重新安装：`rm -rf node_modules apps/*/node_modules packages/*/node_modules && npm ci --no-audit --no-fund`；  
  4. 仅重建 SQLite 原生模块：`npm rebuild better-sqlite3 -w @basketball/api`；  
  5. 仍失败时查看 `cat /root/.npm/_logs/*-debug-*.log` 中 **node-gyp / g++** 报错。  
- **不要用 root 跑业务进程**；但 root 下 `npm ci` 一般可，若遇权限怪问题可改用语义化用户 + 该用户 home 下 npm 缓存（`npm config get cache`）。

## 附：从旧版 PostgreSQL 迁出

若你曾用 PostgreSQL 部署，需**新库重新注册账号**；战术数据请自行导出/迁移（无自动迁移工具）。

## 附：systemd（可选）

若不用 PM2，可参考 [deploy/basketball-api.service.example](../deploy/basketball-api.service.example)。
