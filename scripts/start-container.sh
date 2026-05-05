#!/bin/bash
# Container startup wrapper
# Starts theo-workspace dev server on :3001, then hands off to gateway

WORK=/opt/data/work/theo-workspace
SRC=/mnt/e/theo-workspace
LOG=/opt/data/work/theo-workspace.log

# ── Sync latest source from Windows mount ────────────────────────────────────
if [ -d "$SRC" ]; then
  echo "[startup] Syncing theo-workspace source..."
  for item in src package.json vite.config.ts tsconfig.json server-entry.js assets public skills .env; do
    [ -e "$SRC/$item" ] && cp -r "$SRC/$item" "$WORK/" 2>/dev/null || true
  done
  echo "[startup] Source synced."
fi

# ── Kill any previous instance ───────────────────────────────────────────────
pkill -f "vite.*3001" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
sleep 1

# ── Start theo-workspace ──────────────────────────────────────────────────────
echo "[startup] Starting theo-workspace on :3001..."
cd "$WORK"

# Connect to the local hermes gateway and dashboard directly (same container)
export HERMES_API_URL=http://127.0.0.1:8642
export HERMES_DASHBOARD_URL=http://hermes-dashboard:9119
export HERMES_API_TOKEN=sk-hermes-PM6dYNXILTg-GGPFt5j8XwNNBr16mIC4
export AGENCY_DB_PATH=/opt/data/rjp-os.db
export KANBAN_DB_PATH=/opt/data/kanban.db
export HERMES_PROFILES_DIR=/opt/data/profiles
export PORT=3001
export HOST=0.0.0.0
export HERMES_ALLOW_INSECURE_REMOTE=1
export COOKIE_SECURE=0
export NODE_ENV=development
export CLAUDE_DEFAULT_MODEL=hermes-agent

# Scrape fresh dashboard session token (regenerated on every container start)
echo "[startup] Fetching dashboard token..."
for i in $(seq 1 10); do
  DASH_TOKEN=$(curl -sf http://hermes-dashboard:9119/login 2>/dev/null | grep -o '__HERMES_SESSION_TOKEN__="[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
  if [ -n "$DASH_TOKEN" ]; then
    export CLAUDE_DASHBOARD_TOKEN="$DASH_TOKEN"
    echo "[startup] Dashboard token acquired."
    break
  fi
  sleep 2
done
[ -z "$CLAUDE_DASHBOARD_TOKEN" ] && echo "[startup] Warning: could not get dashboard token, enhanced features may be limited."

nohup node_modules/.bin/vite dev --port 3001 --host 0.0.0.0 >> "$LOG" 2>&1 &
echo "[startup] theo-workspace started (pid $!), log: $LOG"

# ── Hand off to gateway ───────────────────────────────────────────────────────
exec /opt/hermes/.venv/bin/hermes "$@"
