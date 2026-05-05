import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { getAgencyDb, KANBAN_DB_PATH } from '../../../server/agency-db'

const PROFILES_DIR =
  process.env.HERMES_PROFILES_DIR ?? '/opt/data/profiles'

const COST_PER_M: Record<string, { input: number; output: number }> = {
  'gemini-3-1-pro-preview':       { input: 2.00,  output: 12.00 },
  'gemini-3-pro-preview':         { input: 2.00,  output: 12.00 },
  'gemini-3-flash-preview':       { input: 0.50,  output: 3.00  },
  'gemini-3-1-flash-lite-preview':{ input: 0.25,  output: 1.50  },
  'gemini-2.5-pro':               { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':             { input: 0.30,  output: 2.50  },
  'gemini-2.5-flash-lite':        { input: 0.10,  output: 0.40  },
  'claude-sonnet-4-6':            { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':             { input: 1.00,  output: 5.00  },
  'claude-opus-4-7':              { input: 15.00, output: 75.00 },
}

function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const key =
    Object.keys(COST_PER_M).find(
      (k) => model.includes(k) || k.includes(model),
    ) ?? model
  const rates = COST_PER_M[key]
  if (!rates) return 0
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  )
}

type SessionRow = {
  id: string
  model: string | null
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  estimated_cost_usd: number
  started_at: number
  ended_at: number | null
}

export const Route = createFileRoute('/api/agency/cost')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const days = parseInt(url.searchParams.get('days') ?? '30', 10)
        const tenantFilter = url.searchParams.get('tenant') ?? null
        const cutoff = Math.floor(Date.now() / 1000) - days * 86400

        const db = getAgencyDb()
        const projects = db
          .prepare('SELECT id, name, slug FROM projects')
          .all() as { id: number; name: string; slug: string }[]
        const slugToName: Record<string, string> = {}
        for (const p of projects) slugToName[p.slug] = p.name

        // Build task→tenant map from kanban.db
        let taskTenantMap: Record<string, string> = {}
        if (fs.existsSync(KANBAN_DB_PATH)) {
          try {
            const kanban = new Database(KANBAN_DB_PATH, { readonly: true })
            const tasks = kanban
              .prepare(
                'SELECT id, tenant FROM tasks WHERE tenant IS NOT NULL',
              )
              .all() as { id: string; tenant: string }[]
            for (const t of tasks) taskTenantMap[t.id] = t.tenant
            kanban.close()
          } catch { /* non-fatal */ }
        }

        type ProfileSummary = {
          profile: string
          sessions: number
          input_tokens: number
          output_tokens: number
          cost_usd: number
          model: string
        }

        type TenantSummary = {
          tenant: string
          project_name: string | null
          cost_usd: number
          input_tokens: number
          output_tokens: number
          sessions: number
          by_profile: Record<string, { cost_usd: number; sessions: number }>
        }

        const profileSummaries: ProfileSummary[] = []
        const tenantMap: Record<string, TenantSummary> = {}
        let grandTotalCost = 0
        let grandTotalInput = 0
        let grandTotalOutput = 0
        let grandTotalSessions = 0

        if (!fs.existsSync(PROFILES_DIR)) {
          return json({
            period_days: days,
            total: { cost_usd: 0, input_tokens: 0, output_tokens: 0, sessions: 0 },
            by_profile: [],
            by_project: [],
            rates: COST_PER_M,
            note: `Profiles dir not found: ${PROFILES_DIR}`,
          })
        }

        const profileDirs = fs
          .readdirSync(PROFILES_DIR, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name)

        for (const profile of profileDirs) {
          const stateDbPath = path.join(PROFILES_DIR, profile, 'state.db')
          if (!fs.existsSync(stateDbPath)) continue

          let pDb: Database.Database | null = null
          try {
            pDb = new Database(stateDbPath, { readonly: true })
            const rows = pDb
              .prepare(
                `SELECT id, model, input_tokens, output_tokens, cache_read_tokens,
                        estimated_cost_usd, started_at, ended_at
                 FROM sessions
                 WHERE started_at >= ?
                 ORDER BY started_at DESC`,
              )
              .all(cutoff) as SessionRow[]

            let pInput = 0,
              pOutput = 0,
              pCost = 0
            const modelCounts: Record<string, number> = {}

            for (const row of rows) {
              const model = row.model ?? 'unknown'
              const inputTok = row.input_tokens ?? 0
              const outputTok = row.output_tokens ?? 0
              const cost = computeCost(model, inputTok, outputTok)

              pInput += inputTok
              pOutput += outputTok
              pCost += cost
              modelCounts[model] = (modelCounts[model] ?? 0) + 1

              // Try to attribute to a tenant via session file
              let tenant: string | null = null
              const sessionFile = path.join(
                PROFILES_DIR,
                profile,
                'sessions',
                `session_${row.id}.json`,
              )
              if (fs.existsSync(sessionFile)) {
                try {
                  const content = fs.readFileSync(sessionFile, 'utf8')
                  const taskMatches = content.match(/t_[a-f0-9]{12}/g)
                  if (taskMatches) {
                    for (const taskId of taskMatches) {
                      if (taskTenantMap[taskId]) {
                        tenant = taskTenantMap[taskId]
                        break
                      }
                    }
                  }
                } catch { /* skip unreadable */ }
              }

              if (tenant && (!tenantFilter || tenant === tenantFilter)) {
                if (!tenantMap[tenant]) {
                  tenantMap[tenant] = {
                    tenant,
                    project_name: slugToName[tenant] ?? null,
                    cost_usd: 0,
                    input_tokens: 0,
                    output_tokens: 0,
                    sessions: 0,
                    by_profile: {},
                  }
                }
                tenantMap[tenant].cost_usd += cost
                tenantMap[tenant].input_tokens += inputTok
                tenantMap[tenant].output_tokens += outputTok
                tenantMap[tenant].sessions += 1
                if (!tenantMap[tenant].by_profile[profile]) {
                  tenantMap[tenant].by_profile[profile] = {
                    cost_usd: 0,
                    sessions: 0,
                  }
                }
                tenantMap[tenant].by_profile[profile].cost_usd += cost
                tenantMap[tenant].by_profile[profile].sessions += 1
              }
            }

            const dominantModel =
              Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
              'unknown'

            if (rows.length > 0) {
              profileSummaries.push({
                profile,
                sessions: rows.length,
                input_tokens: pInput,
                output_tokens: pOutput,
                cost_usd: pCost,
                model: dominantModel,
              })
              grandTotalCost += pCost
              grandTotalInput += pInput
              grandTotalOutput += pOutput
              grandTotalSessions += rows.length
            }
          } catch { /* skip unreadable state.db */ } finally {
            pDb?.close()
          }
        }

        profileSummaries.sort((a, b) => b.cost_usd - a.cost_usd)
        const tenants = Object.values(tenantMap).sort(
          (a, b) => b.cost_usd - a.cost_usd,
        )

        return json({
          period_days: days,
          total: {
            cost_usd: grandTotalCost,
            input_tokens: grandTotalInput,
            output_tokens: grandTotalOutput,
            sessions: grandTotalSessions,
          },
          by_profile: profileSummaries,
          by_project: tenants,
          rates: COST_PER_M,
        })
      },
    },
  },
})
