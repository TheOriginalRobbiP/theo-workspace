/**
 * agency-db.ts — Database bridge for the /agency section.
 *
 * Opens two SQLite databases:
 *   - rjp-os.db  : business data (clients, projects, project_sections, research)
 *   - kanban.db  : Hermes agentic task execution (tasks, task_links, task_runs, etc.)
 *
 * Both are singletons — safe to import multiple times within the same Node process.
 */

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

// ── Path resolution ───────────────────────────────────────────────────────────
// Priority:
//   1. Explicit env vars (AGENCY_DB_PATH / KANBAN_DB_PATH)
//   2. /opt/data/ — the shared container volume (production)
//   3. Local fallback next to rjp-os source (dev on Windows host)

function resolveDbPath(envVar: string, containerPath: string, localFallback: string): string {
  const fromEnv = process.env[envVar]?.trim()
  if (fromEnv) return fromEnv
  if (fs.existsSync(containerPath)) return containerPath
  return localFallback
}

const AGENCY_DB_PATH = resolveDbPath(
  'AGENCY_DB_PATH',
  '/opt/data/rjp-os.db',
  path.join(process.cwd(), '..', 'rjp-os', 'data', 'rjp-os.db'),
)

const KANBAN_DB_PATH = resolveDbPath(
  'KANBAN_DB_PATH',
  '/opt/data/kanban.db',
  path.join(process.cwd(), '..', 'kanban.db'),
)

// ── Singleton handles ─────────────────────────────────────────────────────────
let _agencyDb: Database.Database | null = null
let _kanbanDb: Database.Database | null = null

// ── Agency DB (rjp-os.db) ────────────────────────────────────────────────────

export function getAgencyDb(): Database.Database {
  if (_agencyDb) return _agencyDb

  // Ensure parent directory exists (useful for dev / first-run)
  const dir = path.dirname(AGENCY_DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const db = new Database(AGENCY_DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initAgencySchema(db)
  _agencyDb = db
  return db
}

// ── Kanban DB (kanban.db) ────────────────────────────────────────────────────

export function getKanbanDb(): Database.Database {
  if (_kanbanDb) return _kanbanDb
  const db = new Database(KANBAN_DB_PATH)
  db.pragma('journal_mode = WAL')
  _kanbanDb = db
  return db
}

// ── Schema bootstrap (idempotent) ─────────────────────────────────────────────
// Mirrors rjp-os lib/db.ts — safe to run every startup.

function initAgencySchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT,
      company     TEXT,
      status      TEXT NOT NULL DEFAULT 'prospect',
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
      name        TEXT NOT NULL,
      slug        TEXT UNIQUE,
      status      TEXT NOT NULL DEFAULT 'active',
      github_url  TEXT,
      deploy_url  TEXT,
      notes       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_sections (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      section     TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, section)
    );

    CREATE TABLE IF NOT EXISTS research (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      url         TEXT,
      notes       TEXT,
      tags        TEXT,
      project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Additive migrations — safe to run every time
  const addIfMissing = (sql: string) => { try { db.exec(sql) } catch { /* already exists */ } }
  addIfMissing('ALTER TABLE projects ADD COLUMN root_path TEXT')
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Return true if kanban.db exists and is readable. */
export function kanbanDbAvailable(): boolean {
  return fs.existsSync(KANBAN_DB_PATH)
}

export { AGENCY_DB_PATH, KANBAN_DB_PATH }
