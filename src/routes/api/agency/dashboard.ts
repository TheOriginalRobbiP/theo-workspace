import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb, getKanbanDb, kanbanDbAvailable } from '../../../server/agency-db'

export const Route = createFileRoute('/api/agency/dashboard')({
  server: {
    handlers: {
      GET: async () => {
        const db = getAgencyDb()

        const clientCount = (
          db
            .prepare(
              "SELECT COUNT(*) as n FROM clients WHERE status != 'inactive'",
            )
            .get() as { n: number }
        ).n

        const projectCount = (
          db
            .prepare(
              "SELECT COUNT(*) as n FROM projects WHERE status = 'active'",
            )
            .get() as { n: number }
        ).n

        let openTasks = 0
        let blockedTasks = 0

        if (kanbanDbAvailable()) {
          try {
            const kanban = getKanbanDb()
            openTasks = (
              kanban
                .prepare(
                  "SELECT COUNT(*) as n FROM tasks WHERE status NOT IN ('done', 'archived')",
                )
                .get() as { n: number }
            ).n
            blockedTasks = (
              kanban
                .prepare(
                  "SELECT COUNT(*) as n FROM tasks WHERE status = 'blocked'",
                )
                .get() as { n: number }
            ).n
          } catch { /* non-fatal */ }
        }

        return json({
          clients: clientCount,
          projects: projectCount,
          open_tasks: openTasks,
          blocked_tasks: blockedTasks,
        })
      },
    },
  },
})
