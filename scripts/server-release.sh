#!/usr/bin/env bash
# 在服务器「应用目录」执行：/var/www/basketball-drill/app
# 用法：bash scripts/server-release.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV="${NODE_ENV:-production}"
npm ci
npm run build
npm run db:push -w @basketball/api

WEB_OUT="${WEB_OUT:-/var/www/basketball-drill/web}"
if [[ -d "$WEB_OUT" ]]; then
  echo "Syncing web dist -> $WEB_OUT"
  sudo rsync -a --delete apps/web/dist/ "$WEB_OUT/"
else
  echo "Skip rsync: WEB_OUT not a directory ($WEB_OUT). Set WEB_OUT or mkdir and chown."
fi

if systemctl is-active --quiet basketball-api 2>/dev/null; then
  echo "Restarting basketball-api"
  sudo systemctl restart basketball-api
else
  echo "Service basketball-api not active; start manually if needed."
fi

echo "Done."
