# Agency Layer — Overlay on hermes-workspace

This repo is a **clean clone** of [outsourc-e/hermes-workspace](https://github.com/outsourc-e/hermes-workspace)
with one commit on top that adds the rjp.digital agency layer.

## Remotes

| Remote | URL | Purpose |
|---|---|---|
| `upstream` | `https://github.com/outsourc-e/hermes-workspace` | Pull upstream updates |
| `fork` | `https://github.com/TheOriginalRobbiP/theo-workspace` | Push our overlay for backup |

## Pulling upstream updates

```bash
git fetch upstream
git rebase upstream/main
# resolve any conflicts (unlikely — agency files are all in new paths)
git push fork main --force-with-lease
```

## What we added (one commit, all new files)

| Path | What |
|---|---|
| `src/server/agency-db.ts` | DB bridge — opens rjp-os.db + kanban.db |
| `src/routes/api/agency/` | 9 API routes (clients, projects, sections, kanban-sync, agents, soul, cost, dashboard) |
| `src/routes/agency/` | Page routes (home, clients, client/$id, projects, project/$id, board, cost) |
| `src/screens/agency/` | All UI screens |
| `src/lib/agency-api.ts` | Typed client-side fetch helpers |
| `src/screens/agents/components/soul-profiles-section.tsx` | SOUL.md editor added to Operations page |
| `src/screens/dashboard/components/agency-widget.tsx` | Agency stats widget on dashboard |

Modified upstream files (minimal surface):
- `src/screens/agents/operations-screen.tsx` — imports SoulProfilesSection
- `src/screens/chat/components/chat-sidebar.tsx` — Agency nav item, Operations → Agents
- `src/components/mobile-hamburger-menu.tsx` — Agency nav item
- `src/screens/dashboard/dashboard-screen.tsx` — imports AgencyWidget
- `vite.config.ts` — adds better-sqlite3 to ssr.external
- `package.json` — adds better-sqlite3 dep + pnpm build allowlist

## Environment (.env)

```env
# Agency DB paths
AGENCY_DB_PATH=/opt/data/rjp-os.db       # or /mnt/e/rjp-os/data/rjp-os.db for dev
KANBAN_DB_PATH=/opt/data/kanban.db
HERMES_PROFILES_DIR=/opt/data/profiles

PORT=3002
```

## Running locally (Windows)

```cmd
cd E:\theo-workspace
npx vite dev --port 3002
```

Open: http://localhost:3002/agency/
