#!/usr/bin/env bash
# 在服务器仓库根执行：/data/node_apps/basketball_drill
# 用法：bash scripts/server-release.sh
# 若需把 dist 同步到其它目录，设置：WEB_OUT=/path/to/web
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
# 降低 npm 自身偶发 "Exit handler never called" 概率；原生模块需本机有 python3、make、g++
export NPM_CONFIG_AUDIT="${NPM_CONFIG_AUDIT:-false}"
export NPM_CONFIG_FUND="${NPM_CONFIG_FUND:-false}"
npm ci --no-audit --no-fund
npm run build
npm run db:push -w @basketball/api

WEB_OUT="${WEB_OUT:-}"
if [[ -n "$WEB_OUT" && -d "$WEB_OUT" ]]; then
  echo "Syncing web dist -> $WEB_OUT"
  sudo rsync -a --delete apps/web/dist/ "$WEB_OUT/"
else
  echo "Nginx root 可指向 $ROOT/apps/web/dist，无需同步其它目录。若设 WEB_OUT=某目录 则执行 rsync。"
fi

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe basketball-api >/dev/null 2>&1; then
    echo "Restarting PM2 app basketball-api"
    pm2 restart basketball-api --update-env
  else
    echo "Starting PM2 app basketball-api (see ecosystem.config.cjs)"
    pm2 start ecosystem.config.cjs --env production
    pm2 save 2>/dev/null || true
  fi
else
  echo "未找到 pm2；请安装: npm i -g pm2 后执行: pm2 start ecosystem.config.cjs --env production"
fi

echo "Done."
