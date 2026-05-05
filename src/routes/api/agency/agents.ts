import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb, getKanbanDb, kanbanDbAvailable } from '../../../server/agency-db'
import { randomBytes } from 'node:crypto'

const KANBAN_TO_DISPLAY: Record<string, string> = {
  triage: 'pending',
  todo: 'pending',
  ready: 'pending',
  running: 'running',
  blocked: 'blocked',
  done: 'done',
  archived: 'done',
}

export const Route = createFileRoute('/api/agency/agents')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!kanbanDbAvailable()) {
          return json({ error: 'kanban.db not found — Hermes not running?' }, { status: 503 })
        }

        const kanban = getKanbanDb()
        const db = getAgencyDb()
        const { searchParams } = new URL(request.url)
        const tenant = searchParams.get('tenant')

        const sql = tenant
          ? `SELECT t.*,
                    (SELECT summary FROM task_runs WHERE task_id = t.id ORDER BY started_at DESC LIMIT 1) as last_summary,
                    (SELECT outcome FROM task_runs WHERE task_id = t.id ORDER BY started_at DESC LIMIT 1) as last_outcome
             FROM tasks t WHERE t.tenant = ? AND t.status != 'archived' ORDER BY t.created_at DESC`
          : `SELECT t.*,
                    (SELECT summary FROM task_runs WHERE task_id = t.id ORDER BY started_at DESC LIMIT 1) as last_summary,
                    (SELECT outcome FROM task_runs WHERE task_id = t.id ORDER BY started_at DESC LIMIT 1) as last_outcome
             FROM tasks t WHERE t.status != 'archived' ORDER BY t.created_at DESC`

        const rawTasks = tenant
          ? kanban.prepare(sql).all(tenant)
          : kanban.prepare(sql).all()

        const projects = db
          .prepare('SELECT id, name, slug FROM projects')
          .all() as { id: number; name: string; slug: string }[]
        const slugToProject = Object.fromEntries(projects.map((p) => [p.slug, p]))

        const tasks = (rawTasks as Record<string, unknown>[]).map((t) => ({
          id: t.id,
          kanban_id: t.id,
          instruction: t.title,
          body: t.body,
          status: KANBAN_TO_DISPLAY[t.status as string] ?? t.status,
          kanban_status: t.status,
          assignee: t.assignee,
          tenant: t.tenant,
          project_name: t.tenant ? (slugToProject[t.tenant as string]?.name ?? t.tenant) : null,
          project_id: t.tenant ? (slugToProject[t.tenant as string]?.id ?? null) : null,
          priority: t.priority,
          result: t.result,
          last_summary: t.last_summary,
          last_outcome: t.last_outcome,
          workspace_kind: t.workspace_kind,
          workspace_path: t.workspace_path,
          created_at: new Date((t.created_at as number) * 1000).toISOString(),
          updated_at: t.completed_at
            ? new Date((t.completed_at as number) * 1000).toISOString()
            : new Date((t.created_at as number) * 1000).toISOString(),
        }))

        return json(tasks)
      },

      POST: async ({ request }) => {
        if (!kanbanDbAvailable()) {
          return json({ error: 'kanban.db not found — Hermes not running?' }, { status: 503 })
        }

        const kanban = getKanbanDb()
        const db = getAgencyDb()

        const {
          instruction, project_id, assignee, body,
          priority = 0, workspace_kind = 'scratch', workspace_path,
        } = await request.json()

        if (!instruction)
          return json({ error: 'instruction required' }, { status: 400 })

        let tenant: string | null = null
        if (project_id) {
          const p = db.prepare('SELECT slug FROM projects WHERE id = ?').get(project_id) as { slug: string } | undefined
          if (p?.slug) tenant = p.slug
        }

        const taskId = `t_${randomBytes(6).toString('hex')}`
        const now = Math.floor(Date.now() / 1000)

        kanban.prepare(
          `INSERT INTO tasks (id, title, body, assignee, status, priority, tenant,
                              workspace_kind, workspace_path, created_at)
           VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?)`,
        ).run(taskId, instruction, body ?? null, assignee ?? null, priority, tenant, workspace_kind, workspace_path ?? null, now)

        const raw = kanban.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Record<string, unknown>

        return json({
          id: taskId,
          kanban_id: taskId,
          instruction: raw.title,
          status: 'pending',
          kanban_status: raw.status,
          assignee: raw.assignee,
          tenant,
          project_id: project_id ?? null,
          created_at: new Date(now * 1000).toISOString(),
        }, { status: 201 })
      },
    },
  },
})
