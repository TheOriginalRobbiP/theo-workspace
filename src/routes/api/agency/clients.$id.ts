import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb } from '../../../server/agency-db'

export const Route = createFileRoute('/api/agency/clients/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getAgencyDb()
        const client = db
          .prepare('SELECT * FROM clients WHERE id = ?')
          .get(params.id)
        if (!client)
          return json({ error: 'not found' }, { status: 404 })
        return json(client)
      },

      PATCH: async ({ request, params }) => {
        const db = getAgencyDb()
        const fields = await request.json()
        const allowed = ['name', 'email', 'company', 'status', 'notes']
        const updates = Object.entries(fields).filter(([k]) =>
          allowed.includes(k),
        )
        if (updates.length === 0)
          return json(
            { error: 'nothing to update' },
            { status: 400 },
          )

        const set = updates.map(([k]) => `${k} = ?`).join(', ')
        const vals = updates.map(([, v]) => v)
        db.prepare(
          `UPDATE clients SET ${set}, updated_at = datetime('now') WHERE id = ?`,
        ).run(...vals, params.id)

        const client = db
          .prepare('SELECT * FROM clients WHERE id = ?')
          .get(params.id)
        return json(client)
      },

      DELETE: async ({ params }) => {
        const db = getAgencyDb()
        db.prepare('DELETE FROM clients WHERE id = ?').run(params.id)
        return json({ ok: true })
      },
    },
  },
})
