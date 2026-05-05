#!/bin/bash
# Container startup wrapper — starts theo-workspace dev server, then hands off to gateway.
# Lives at /mnt/e/theo-workspace/scripts/start-container.sh
# Replaces the old rjp-os startup in /opt/data/startup/start.sh

set -euo pipefail

WORK_DIR=/opt/data/work/theo-workspace
SRC_DIR=/mnt/e/theo-workspace
LOG=/opt/data/work/theo-workspace.log

echo "[startup] Syncing theo-workspace source from /mnt/e..."
mkdir -p "$WORK_DIR"

# Copy src + config files from the Windows mount (fast, just metadata diff)
cp -ru "$SRC_DIR/src" "$WORK_DIR/"
cp -f  "$SRC_DIR/package.json" "$WORK_DIR/"
cp -f  "$SRC_DIR/pnpm-lock.yaml" "$WORK_DIR/"
cp -f  "$SRC_DIR/vite.config.ts" "$WORK_DIR/"
cp -f  "$SRC_DIR/tsconfig.json" "$WORK_DIR/"
cp -f  "$SRC_DIR/server-entry.js" "$WORK_DIR/" 2>/dev/null || true
cp -f  "$SRC_DIR/.env" "$WORK_DIR/" 2>/dev/null || true
cp -ru "$SRC_DIR/assets" "$WORK_DIR/" 2>/dev/null || true
cp -ru "$SRC_DIR/public" "$WORK_DIR/" 2>/dev/null || true
cp -ru "$SRC_DIR/skills" "$WORK_DIR/" 2>/dev/null || true

echo "[startup] Source synced."

# Install/update deps only if node_modules is missing or package.json changed
if [ ! -d "$WORK_DIR/node_modules" ]; then
    echo "[startup] Installing deps (first run)..."
    cd "$WORK_DIR" && pnpm install --reporter=silent
    echo "[startup] Deps installed."
fi

# Kill any previous instance
pkill -f "vite.*3001" 2>/dev/null || true
sleep 1

echo "[startup] Starting theo-workspace on :3001..."
cd "$WORK_DIR"
NODE_OPTIONS="--max-old-space-size=2048" \
  nohup pnpm exec vite dev --port 3001 --host 0.0.0.0 >> "$LOG" 2>&1 &

echo "[startup] theo-workspace started (pid $!), log: $LOG"

# Hand off to the real gateway entrypoint
exec /opt/hermes/.venv/bin/hermes "$@"
