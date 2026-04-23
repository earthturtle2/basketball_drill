# basketball.itorange.online 云上部署（腾讯云轻量 + Nginx + systemd）

与同机 `english.itorange.online`、`stock.itorange.online` 并列，按子域新启一个 `server` 块即可，不动其它站点配置。

## 1. 准备

- **DNS**：`A` 记录 `basketball` → 轻量服务器公网 IP（可与其他子域同 IP）。  
- **本机/服务器**：Node.js 20+、PostgreSQL（本机或云数据库）、Nginx。  
- **目录约定**（可按需改路径，与 systemd 一致即可）  
  - 代码与构建：`/var/www/basketball-drill/app`  
  - 静态站点：`/var/www/basketball-drill/web`（仅放 `apps/web` 的 `dist` 内容）

## 2. 获取代码

```bash
sudo mkdir -p /var/www/basketball-drill
sudo chown -R "$USER":"$USER" /var/www/basketball-drill
cd /var/www/basketball-drill
git clone <你的仓库 URL> app
cd app
```

## 3. 环境与数据库

1. 复制并编辑环境变量（**勿把真实 .env 提交到 git**）：

   ```bash
   cp .env.example .env
   # 或参考仓库内 deploy/.env.production.example
   ```

2. 生产建议：`HOST=127.0.0.1`，仅本机 Nginx 反代到 3001。  
3. 设置 `PUBLIC_APP_URL=https://basketball.itorange.online`。  
4. 在 PostgreSQL 中建库、用户、授权，将连接串写入 `DATABASE_URL`，然后：

   ```bash
   npm ci
   npm run build
   npm run db:push -w @basketball/api
   ```

## 4. 构建前端产物到 Nginx 目录

```bash
sudo mkdir -p /var/www/basketball-drill/web
sudo rsync -a --delete apps/web/dist/ /var/www/basketball-drill/web/
sudo chown -R www-data:www-data /var/www/basketball-drill/web
```

之后每次发版在 `app` 目录 `npm run build` 后重复 `rsync` 即可（或把该命令写进发布脚本）。

## 5. systemd 托管 API

1. 复制 [deploy/basketball-api.service.example](../deploy/basketball-api.service.example) 为 `/etc/systemd/system/basketball-api.service`，按实际 `User`、路径、`ExecStart` 中 `node` 路径检查一遍。  
2. `WorkingDirectory` 为仓库根（含 `package-lock.json` 的目录）。  
3. 加载并启动：

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now basketball-api
   sudo systemctl status basketball-api
   ```

4. 本机探活：`curl -sS http://127.0.0.1:3001/health` 与 `curl -sS http://127.0.0.1:3001/api/v1/...`（需带鉴权则略）。

## 6. Nginx

1. 参考 [deploy/nginx-basketball.itorange.online.conf.example](../deploy/nginx-basketball.itorange.online.conf.example)，写入站点配置。  
2. 重点：  
   - `root` 指向前端 `dist` 同步目录。  
   - `location /api/` 使用 `proxy_pass http://127.0.0.1:3001;`（**无 URI 尾缀**），使上游收到路径仍为 `/api/v1/...`。  
3. 配置 SSL 后 `nginx -t` 并 `reload`。

## 7. 发版小抄

在服务器 `app` 目录：

```bash
git pull
npm ci
npm run build
npm run db:push -w @basketball/api
sudo systemctl restart basketball-api
sudo rsync -a --delete apps/web/dist/ /var/www/basketball-drill/web/
```

若仅改前端，可只 `npm run build -w @basketball/web` 并 rsync + 可选重启 API。

## 8. 排错

- **502 / 无响应**：`journalctl -u basketball-api -f`；确认 `PORT`、防火墙仅本机连数据库。  
- **404 前端子路由**：确认 Nginx 对 `/` 使用 `try_files ... /index.html;`。  
- **API 404**：确认 Nginx 未用 `proxy_pass http://127.0.0.1:3001/api/` 之类剥掉路径。
