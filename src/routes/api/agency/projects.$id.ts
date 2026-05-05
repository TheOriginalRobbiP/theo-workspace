import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb } from '../../../server/agency-db'

export const Route = createFileRoute('/api/agency/projects/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getAgencyDb()
        const project = db
          .prepare(
            `SELECT p.*, c.name as client_name
             FROM projects p LEFT JOIN clients c ON c.id = p.client_id
             WHERE p.id = ?`,
          )
          .get(params.id)
        if (!project)
          return json({ error: 'not found' }, { status: 404 })
        return json(project)
      },

      PATCH: async ({ request, params }) => {
        const db = getAgencyDb()
        const fields = await request.json()
        const allowed = [
          'name', 'slug', 'client_id', 'status',
          'github_url', 'deploy_url', 'notes', 'root_path',
        ]
        const updates = Object.entries(fields).filter(([k]) =>
          allowed.includes(k),
        )
        if (updates.length === 0)
          return json({ error: 'nothing to update' }, { status: 400 })

        const set = updates.map(([k]) => `${k} = ?`).join(', ')
        const vals = updates.map(([, v]) => v)
        db.prepare(
          `UPDATE projects SET ${set}, updated_at = datetime('now') WHERE id = ?`,
        ).run(...vals, params.id)

        const project = db
          .prepare('SELECT * FROM projects WHERE id = ?')
          .get(params.id)
        return json(project)
      },

      DELETE: async ({ params }) => {
        const db = getAgencyDb()
        db.prepare('DELETE FROM projects WHERE id = ?').run(params.id)
        return json({ ok: true })
      },
    },
  },
})
