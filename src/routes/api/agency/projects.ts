import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb } from '../../../server/agency-db'

export const Route = createFileRoute('/api/agency/projects')({
  server: {
    handlers: {
      GET: async () => {
        const db = getAgencyDb()
        const projects = db
          .prepare(
            `SELECT p.*, c.name as client_name
             FROM projects p
             LEFT JOIN clients c ON c.id = p.client_id
             ORDER BY p.created_at DESC`,
          )
          .all()
        return json(projects)
      },

      POST: async ({ request }) => {
        const db = getAgencyDb()
        const { name, slug, client_id, status, github_url, deploy_url, notes } =
          await request.json()
        if (!name)
          return json({ error: 'name required' }, { status: 400 })

        const result = db
          .prepare(
            `INSERT INTO projects (name, slug, client_id, status, github_url, deploy_url, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            name,
            slug ?? name.toLowerCase().replace(/\s+/g, '-'),
            client_id ?? null,
            status ?? 'active',
            github_url ?? null,
            deploy_url ?? null,
            notes ?? null,
          )

        const project = db
          .prepare('SELECT * FROM projects WHERE id = ?')
          .get(result.lastInsertRowid)
        return json(project, { status: 201 })
      },
    },
  },
})
