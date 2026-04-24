#!/usr/bin/env bash
# 构建 + 重启，由 post-receive hook 或手动执行
# 用法：bash scripts/server-release.sh
set -euo pipefail
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1/4] npm ci"
NPM_CONFIG_AUDIT=false NPM_CONFIG_FUND=false npm ci --no-audit --no-fund

echo "[2/4] build"
NODE_ENV=production npm run build

echo "[3/4] db:push"
npm run db:push -w @basketball/api

echo "[4/4] pm2 restart"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe basketball-api >/dev/null 2>&1; then
    pm2 restart basketball-api --update-env
  else
    pm2 start ecosystem.config.cjs --env production
    pm2 save 2>/dev/null || true
  fi
else
  echo "pm2 未安装，请先: npm i -g pm2"
  exit 1
fi

echo "Done ✓"
