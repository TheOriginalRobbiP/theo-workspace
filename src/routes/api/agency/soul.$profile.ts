import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import fs from 'node:fs'
import path from 'node:path'

const PROFILES_DIR =
  process.env.HERMES_PROFILES_DIR ?? '/opt/data/profiles'

export const Route = createFileRoute('/api/agency/soul/$profile')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const p = params as unknown as { profile: string }
        const profileDir = path.join(PROFILES_DIR, p.profile)
        if (!fs.existsSync(profileDir)) {
          return json({ error: 'profile not found' }, { status: 404 })
        }

        for (const name of ['SOUL.md', 'soul.md']) {
          const candidate = path.join(profileDir, name)
          if (fs.existsSync(candidate)) {
            return json({
              profile: p.profile,
              soul: fs.readFileSync(candidate, 'utf8'),
              path: candidate,
            })
          }
        }

        return json({ error: 'SOUL.md not found for this profile' }, { status: 404 })
      },

      PATCH: async ({ request, params }) => {
        const { soul } = await request.json()
        if (typeof soul !== 'string') {
          return json({ error: 'soul content required' }, { status: 400 })
        }

        const pp = params as unknown as { profile: string }
        const profileDir = path.join(PROFILES_DIR, pp.profile)
        if (!fs.existsSync(profileDir)) {
          return json({ error: 'profile not found' }, { status: 404 })
        }

        const soulPath = path.join(profileDir, 'SOUL.md')

        if (fs.existsSync(soulPath)) {
          fs.copyFileSync(soulPath, `${soulPath}.bak`)
        }

        fs.writeFileSync(soulPath, soul, 'utf8')
        return json({ ok: true, path: soulPath })
      },
    },
  },
})
