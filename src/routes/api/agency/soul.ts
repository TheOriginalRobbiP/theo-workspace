import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import fs from 'node:fs'
import path from 'node:path'

const PROFILES_DIR =
  process.env.HERMES_PROFILES_DIR ?? '/opt/data/profiles'

const AGENT_META: Record<
  string,
  { model: string; role: string; color: string }
> = {
  theodore: {
    model: 'claude-sonnet-4-6',
    role: 'Orchestrator / Project Manager',
    color: 'bg-navy/10 text-navy',
  },
  coder: {
    model: 'gemini-3-1-pro-preview',
    role: 'Frontend Developer',
    color: 'bg-blue-100 text-blue-700',
  },
  'backend-coder': {
    model: 'gemini-3-1-pro-preview',
    role: 'Backend Engineer',
    color: 'bg-indigo-100 text-indigo-700',
  },
  designer: {
    model: 'gemini-3-1-pro-preview',
    role: 'UI/UX Designer',
    color: 'bg-pink-100 text-pink-700',
  },
  deployer: {
    model: 'gemini-2.5-flash',
    role: 'Deployment Engineer',
    color: 'bg-violet-100 text-violet-700',
  },
  writer: {
    model: 'gemini-2.0-flash-lite',
    role: 'Copywriter',
    color: 'bg-purple-100 text-purple-700',
  },
  analyst: {
    model: 'gemini-2.0-flash-lite',
    role: 'Researcher & SEO Analyst',
    color: 'bg-orange-100 text-orange-700',
  },
  reviewer: {
    model: 'claude-haiku-4-5',
    role: 'QA & Accessibility Reviewer',
    color: 'bg-green-100 text-green-700',
  },
}

function readSoulMd(profileDir: string): string | null {
  for (const name of ['SOUL.md', 'soul.md']) {
    const candidate = path.join(profileDir, name)
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8')
  }
  return null
}

function readConfigModel(profileDir: string): string | null {
  for (const name of ['config.yaml', 'config.yml']) {
    const candidate = path.join(profileDir, name)
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8')
        const nestedMatch = raw.match(
          /^model:\s*\n(?:[ \t]+\S[^\n]*\n)*?[ \t]+default:\s*["']?([^\s"'\n]+)["']?/m,
        )
        if (nestedMatch) return nestedMatch[1]
        const flatMatch = raw.match(/^model:\s*["']?([^\s"'\n{]+)["']?/m)
        if (flatMatch && flatMatch[1] !== '') return flatMatch[1]
      } catch { /* ignore */ }
    }
  }
  return null
}

export const Route = createFileRoute('/api/agency/soul')({
  server: {
    handlers: {
      GET: async () => {
        try {
          if (!fs.existsSync(PROFILES_DIR)) {
            const stubs = Object.entries(AGENT_META).map(([name, meta]) => ({
              name,
              ...meta,
              hasSoul: false,
              soul: null,
              configModel: null,
              profilePath: null,
              error: `Profiles directory not found: ${PROFILES_DIR}`,
            }))
            return json(stubs)
          }

          const entries = fs.readdirSync(PROFILES_DIR, { withFileTypes: true })
          const profiles = entries
            .filter((e) => e.isDirectory())
            .map((e) => {
              const name = e.name
              const dir = path.join(PROFILES_DIR, name)
              const soul = readSoulMd(dir)
              const configModel = readConfigModel(dir)
              const meta = AGENT_META[name] ?? {
                model: configModel ?? 'unknown',
                role: 'Specialist Agent',
                color: 'bg-muted/10 text-muted',
              }

              return {
                name,
                model: configModel ?? meta.model,
                role: meta.role,
                color: meta.color,
                hasSoul: soul !== null,
                soul,
                configModel,
                profilePath: dir,
              }
            })

          const order = Object.keys(AGENT_META)
          profiles.sort((a, b) => {
            const ia = order.indexOf(a.name)
            const ib = order.indexOf(b.name)
            if (ia === -1 && ib === -1) return a.name.localeCompare(b.name)
            if (ia === -1) return 1
            if (ib === -1) return -1
            return ia - ib
          })

          return json(profiles)
        } catch (err) {
          return json({ error: String(err) }, { status: 500 })
        }
      },
    },
  },
})
