#!/usr/bin/env bash
# 在服务器仓库根执行：/data/node_app/basketball_drill
# 用法：bash scripts/server-release.sh
# 若需把 dist 同步到其它目录，设置：WEB_OUT=/path/to/web
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
npm ci
npm run build
npm run db:push -w @basketball/api

WEB_OUT="${WEB_OUT:-}"
if [[ -n "$WEB_OUT" && -d "$WEB_OUT" ]]; then
  echo "Syncing web dist -> $WEB_OUT"
  sudo rsync -a --delete apps/web/dist/ "$WEB_OUT/"
else
  echo "Nginx root 可指向 $ROOT/apps/web/dist，无需同步其它目录。若设 WEB_OUT=某目录 则执行 rsync。"
fi

if systemctl is-active --quiet basketball-api 2>/dev/null; then
  echo "Restarting basketball-api"
  sudo systemctl restart basketball-api
else
  echo "Service basketball-api not active; start manually if needed."
fi

echo "Done."
