# basketball.itorange.online 云上部署（itorange.online 主机）

与同机 `english.itorange.online`、`stock.itorange.online` 并列，在 Nginx 里为子域新启一个 `server` 块即可，不动其它站点。

## 1. 准备

- **主机**：`itorange.online` 上的应用目录为 **`/data/node_app/basketball_drill`**（仓库根，即本 monorepo 根目录），需与 [deploy/basketball-api.service.example](../deploy/basketball-api.service.example) 中 `WorkingDirectory` 一致。  
- **代码仓库**：`git@github.com:earthturtle2/basketball_drill.git`  
- **DNS**：`A` 记录 `basketball` → 与现有子域可相同公网 IP。  
- **本机/服务器**：Node.js 20+、PostgreSQL、Nginx。  

## 2. 获取代码

```bash
sudo mkdir -p /data/node_app
sudo chown -R "$USER":"$USER" /data/node_app
cd /data/node_app
git clone git@github.com:earthturtle2/basketball_drill.git basketball_drill
cd basketball_drill
```

若目录已存在且需拉取更新：`cd /data/node_app/basketball_drill && git pull`。

## 3. 环境与数据库

1. 复制并编辑环境变量（**勿把真实 .env 提交到 git**）：

   ```bash
   cp .env.example .env
   # 或参考 deploy/.env.production.example
   ```

2. 生产建议：`HOST=127.0.0.1`，仅本机 Nginx 反代到 `PORT`（默认 3001）。  
3. 设置 `PUBLIC_APP_URL=https://basketball.itorange.online`。  
4. 在 PostgreSQL 中建库、用户、授权，将连接串写入 `DATABASE_URL`，然后：

   ```bash
   npm ci
   npm run build
   npm run db:push -w @basketball/api
   ```

## 4. 前端静态目录

构建后前端在 **`/data/node_app/basketball_drill/apps/web/dist/`**。Nginx 的 `root` 直接指向该路径即可，**一般无需**再 rsync 到其它目录。若你坚持使用单独目录，可通过环境变量 `WEB_OUT` 见 [scripts/server-release.sh](../scripts/server-release.sh)。

## 5. systemd 托管 API

1. 复制 [deploy/basketball-api.service.example](../deploy/basketball-api.service.example) 为 `/etc/systemd/system/basketball-api.service`，将 `User` / `Group` 改为与 `/data/node_app` 下目录属主一致（如部署用户，而非 root）。  
2. `WorkingDirectory` 为 **`/data/node_app/basketball_drill`**，`EnvironmentFile` 为同目录下 `.env`。  
3. 加载并启动：

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now basketball-api
   sudo systemctl status basketball-api
   ```

4. 本机探活：`curl -sS http://127.0.0.1:3001/health`。

## 6. Nginx

1. 参考 [deploy/nginx-basketball.itorange.online.conf.example](../deploy/nginx-basketball.itorange.online.conf.example)，`root` 为 **`/data/node_app/basketball_drill/apps/web/dist`**。  
2. `location /api/` 使用 `proxy_pass http://127.0.0.1:3001;`（**无 URI 尾缀**），使上游路径仍为 `/api/v1/...`。  
3. 配置与现有子域共用的 **SSL 证书**（如泛域 `*.itorange.online`），`nginx -t` 后 `reload`。

## 7. 发版小抄

在服务器 **仓库根** `/data/node_app/basketball_drill`：

```bash
git pull
bash scripts/server-release.sh
```

或手動：

```bash
npm ci
npm run build
npm run db:push -w @basketball/api
sudo systemctl restart basketball-api
```

## 8. 排错

- **502 / 无响应**：`journalctl -u basketball-api -f`；确认 `PORT`、本机可连 `DATABASE_URL`。  
- **404 子路由**：`location /` 需 `try_files $uri $uri/ /index.html;`。  
- **API 404**：勿使用会剥去 `/api` 前缀的 `proxy_pass` 写法。
