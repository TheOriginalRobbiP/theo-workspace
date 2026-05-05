# syntax=docker/dockerfile:1.6
# Hermes Workspace — production Docker image
# Publishes to ghcr.io/outsourc-e/hermes-workspace
#
# Build locally:
#   docker build -t hermes-workspace .
# Run:
#   docker run -p 3000:3000 -e HERMES_API_URL=http://host.docker.internal:8642 hermes-workspace
# Or pull pre-built:
#   docker pull ghcr.io/outsourc-e/hermes-workspace:latest
#
# ─── build stage ─────────────────────────────────────────────────────────
FROM node:22-slim AS build
# python3, make, g++ are required by node-gyp to compile better-sqlite3 native binding
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps (cache-friendly: copy only manifests first)
# PNPM_BUILD_DEPS allows better-sqlite3 to run its build scripts
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --config.unsafe-perm=true

# Copy sources and build
COPY . .
RUN pnpm build

# ─── runtime stage ────────────────────────────────────────────────────────
FROM node:22-slim
# python3 is required by scripts/pty-helper.py (terminal feature).
# python3 + make + g++ are required to rebuild better-sqlite3 native binding
# in the runtime stage (pnpm symlink store doesn't survive multi-stage copy cleanly).
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl tini python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r workspace && useradd -r -g workspace -u 10010 workspace

WORKDIR /app

# Copy build artefacts + runtime deps.
COPY --from=build --chown=workspace:workspace /app/dist ./dist
COPY --from=build --chown=workspace:workspace /app/node_modules ./node_modules
COPY --from=build --chown=workspace:workspace /app/package.json ./package.json
COPY --from=build --chown=workspace:workspace /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build --chown=workspace:workspace /app/server-entry.js ./server-entry.js
COPY --from=build --chown=workspace:workspace /app/skills ./skills

# Rebuild better-sqlite3 native binding for the runtime environment.
# pnpm's virtual store symlinks don't survive multi-stage COPY cleanly,
# so we install only better-sqlite3 fresh to get the correct .node binary.
RUN pnpm add better-sqlite3 --config.unsafe-perm=true && \
    chown -R workspace:workspace /app/node_modules/better-sqlite3

USER workspace
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    HERMES_API_URL=http://hermes:8642

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3001/ >/dev/null || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--max-old-space-size=2048", "server-entry.js"]
