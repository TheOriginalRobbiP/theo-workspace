import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb } from '../../../server/agency-db'

export const Route = createFileRoute('/api/agency/clients')({
  server: {
    handlers: {
      GET: async () => {
        const db = getAgencyDb()
        const clients = db
          .prepare('SELECT * FROM clients ORDER BY created_at DESC')
          .all()
        return json(clients)
      },

      POST: async ({ request }) => {
        const db = getAgencyDb()
        const { name, email, company, status, notes } = await request.json()
        if (!name)
          return json({ error: 'name required' }, { status: 400 })

        const result = db
          .prepare(
            `INSERT INTO clients (name, email, company, status, notes)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            name,
            email ?? null,
            company ?? null,
            status ?? 'prospect',
            notes ?? null,
          )

        const client = db
          .prepare('SELECT * FROM clients WHERE id = ?')
          .get(result.lastInsertRowid)
        return json(client, { status: 201 })
      },
    },
  },
})
