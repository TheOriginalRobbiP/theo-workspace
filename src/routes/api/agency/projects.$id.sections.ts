import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb } from '../../../server/agency-db'
import fs from 'node:fs'
import path from 'node:path'

export const Route = createFileRoute('/api/agency/projects/$id/sections')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const db = getAgencyDb()
        const sections = db
          .prepare(
            'SELECT section, content, updated_at FROM project_sections WHERE project_id = ? ORDER BY section',
          )
          .all(params.id)
        return json(sections)
      },

      PATCH: async ({ request, params }) => {
        const db = getAgencyDb()
        const { section, content } = await request.json()
        if (!section)
          return json({ error: 'section required' }, { status: 400 })

        db.prepare(
          `INSERT INTO project_sections (project_id, section, content)
           VALUES (?, ?, ?)
           ON CONFLICT(project_id, section) DO UPDATE
             SET content = excluded.content, updated_at = datetime('now')`,
        ).run(params.id, section, content ?? '')

        return json({ ok: true })
      },

      POST: async ({ params }) => {
        const db = getAgencyDb()
        const project = db
          .prepare('SELECT root_path FROM projects WHERE id = ?')
          .get(params.id) as { root_path: string | null } | undefined

        if (!project?.root_path)
          return json({ error: 'No repo set up for this project' }, { status: 400 })

        const specDir = path.join(project.root_path, 'spec')
        if (!fs.existsSync(specDir))
          return json({ error: 'No spec/ directory found. Run `openspec propose` first.' }, { status: 404 })

        const files = fs.readdirSync(specDir).filter((f) => f.endsWith('.md'))
        if (files.length === 0)
          return json({ error: 'spec/ directory is empty.' }, { status: 404 })

        let combined = ''
        for (const file of files.sort()) {
          const content = fs.readFileSync(path.join(specDir, file), 'utf8')
          combined += `# ${file}\n\n${content}\n\n---\n\n`
        }

        const taskFile = path.join(project.root_path, 'tasks.md')
        let tasks = ''
        if (fs.existsSync(taskFile)) tasks = fs.readFileSync(taskFile, 'utf8')

        db.prepare(
          `INSERT INTO project_sections (project_id, section, content)
           VALUES (?, 'spec', ?)
           ON CONFLICT(project_id, section) DO UPDATE
             SET content = excluded.content, updated_at = datetime('now')`,
        ).run(params.id, combined)

        return json({ ok: true, files, tasks_found: !!tasks, tasks })
      },
    },
  },
})
