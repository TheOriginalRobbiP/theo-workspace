import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getAgencyDb, getKanbanDb } from '../../../server/agency-db'
import { randomBytes } from 'node:crypto'

// ─── Assignee inference ────────────────────────────────────────────────────────

function inferAssignee(title: string): string {
  const lower = title.toLowerCase()

  if (/^\[backend\]/i.test(title)) return 'backend-coder'
  if (/^\[deploy\]/i.test(title)) return 'deployer'
  if (/^\[research\]/i.test(title)) return 'analyst'
  if (/^\[design\]/i.test(title)) return 'designer'
  if (/^\[copy\]/i.test(title)) return 'writer'
  if (/^\[review\]/i.test(title)) return 'reviewer'
  if (/^\[frontend\]/i.test(title)) return 'coder'

  if (
    /\b(schema|database|auth|authentication|session|middleware|api route|api endpoint|stripe|webhook|migration|postgres|postgresql|drizzle|better.?auth|password reset|subscription|membership gat|backend|server.?side|drizzle.?orm)\b/.test(
      lower,
    )
  )
    return 'backend-coder'

  if (
    /\b(deploy|docker|build image|container|dokploy|environment variable|smoke test|ship|go.?live|launch|hosting)\b/.test(
      lower,
    )
  )
    return 'deployer'

  if (
    /\b(research|analyse|analyze|audit|report|competitor|benchmark|survey|summarise|summarize|gather data|investigate)\b/.test(
      lower,
    )
  )
    return 'analyst'
  if (
    /\b(seo|keyword|meta|search analytics|google analytics|rank|serp|sitemap|backlink|traffic)\b/.test(
      lower,
    )
  )
    return 'analyst'

  if (
    /\b(design|ui|ux|brand|logo|color|colour|typography|figma|wireframe|mockup|palette|tokens|spacing)\b/.test(
      lower,
    )
  )
    return 'designer'

  if (
    /\b(write|copy|blog post|content|headline|tagline|cta|email|newsletter|page copy|landing copy)\b/.test(
      lower,
    )
  )
    return 'writer'

  if (
    /\b(review|qa|test|check|validate|accessibility|a11y|quality)\b/.test(lower)
  )
    return 'reviewer'

  return 'coder'
}

// ─── Dependency tiers ──────────────────────────────────────────────────────────

function assigneeTier(assignee: string): number {
  const tiers: Record<string, number> = {
    analyst: 1,
    designer: 1,
    writer: 1,
    'backend-coder': 2,
    coder: 3,
    deployer: 4,
    reviewer: 5,
  }
  return tiers[assignee] ?? 3
}

// ─── Skills per assignee ───────────────────────────────────────────────────────

function skillsForAssignee(assignee: string): string[] | null {
  const map: Record<string, string[]> = {
    coder: [
      'impeccable',
      'astro-6-static-site',
      'design-system-handoff-to-astro',
      'systematic-debugging',
      'lcp-image-optimisation',
    ],
    'backend-coder': ['systematic-debugging'],
    designer: ['design-md', 'popular-web-designs', 'impeccable'],
    writer: ['serp-research-bot-evasion'],
    analyst: ['gsc-content-prioritisation', 'serp-research-bot-evasion'],
    reviewer: [
      'github-code-review',
      'systematic-debugging',
      'astro-seo-audit-and-fix',
    ],
    deployer: [],
  }
  const skills = map[assignee]
  if (!skills || skills.length === 0) return null
  return skills
}

// ─── Task body injection ───────────────────────────────────────────────────────

function bodyForAssignee(
  assignee: string,
  title: string,
  projectName: string,
  slug: string,
): string {
  const shared = `/opt/data/kanban/shared/${slug}`
  const lines: string[] = [
    `Auto-created from project spec.`,
    ``,
    `Project: ${projectName}`,
    `Tenant: ${slug}`,
    `Original task: ${title}`,
    ``,
  ]

  const isHomePage =
    /\bhome\s*page\b|build.*index\.astro|build.*home\b/i.test(title) &&
    !/about|services|contact|shop|journal|portal|admin/i.test(title)

  if (assignee === 'coder') {
    lines.push(
      `IMPORTANT: Before writing any code, read:`,
      `- ${shared}/tokens.json (designer colour/type tokens)`,
      `- ${shared}/DESIGN.md (visual system)`,
      `- ${shared}/API.md (backend API contract — if it exists, ALL data fetching must use these endpoints)`,
      `- ${shared}/COPY.md or parent task workspaces for writer copy (*_copy.md, COPY.md)`,
      ``,
      `Use the impeccable skill throughout. OKLCH colours only. No placeholder text.`,
      `If API.md exists but a required endpoint is missing, block — do not invent an API.`,
      ``,
      `COMPONENT RULE: Never write bare CSS class names. Always use components:`,
      `- Buttons → <Button variant="primary|secondary|ghost"> from components/ui/Button.astro`,
      `- Badges → <Badge> / <Badge variant="sage"> from components/ui/Badge.astro`,
      `- Cards → <Card type="project|blog|service"> from components/ui/Card.astro`,
      `- Section spacing → use Tailwind utilities (py-20 md:py-32), never class="section-spacing"`,
      `- Never write: class="btn-primary", class="badge-sage", class="card", class="section-spacing"`,
      ``,
      `LAYOUT RULE: Check what layout the other pages import. Use the same one.`,
      `  grep -r "import.*Layout" src/pages/ | head -5`,
      `If most pages use Layout.astro (has nav+footer), use Layout.astro.`,
      `Only use BaseLayout.astro directly for pages that intentionally have no nav (e.g. login).`,
    )

    if (isHomePage) {
      lines.push(
        ``,
        `━━━ HOME PAGE RULES (critical) ━━━`,
        `index.astro must be the REAL home page that a client can show customers.`,
        `It must contain actual content sections — hero, services overview, about, journal preview, CTA.`,
        ``,
        `It must NOT contain: typography scales, button specimens, "Display/Heading/Body" labels,`,
        `component showcases, or design system demos. Those are for a separate design-system.astro.`,
        ``,
        `Before completing: open index.astro and ask yourself — if a client opened this in a browser,`,
        `would they see their business? If you see "Display / Heading / Subheading" labels or`,
        `"Primary Button / Secondary Button / Ghost Button" demos: rewrite the page completely.`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      )
    }
  } else if (assignee === 'backend-coder') {
    lines.push(
      `IMPORTANT: Before writing any code, read:`,
      `- ${shared}/BRIEF.md (feature scope and client goals)`,
      `- ${shared}/API.md (if it exists — append to it, never overwrite it)`,
      `- ${shared}/schema.ts (if it exists — a previous task wrote this, build on it not over it)`,
      ``,
      `SCHEMA RULE: If db/schema.ts already exists in this workspace, READ IT FIRST.`,
      `Add only the tables your task requires. Never rewrite tables that already exist.`,
      `After writing schema.ts, copy it to the shared path:`,
      `  cp db/schema.ts ${shared}/schema.ts`,
      ``,
      `Stack: Next.js 15 API routes, better-auth, Drizzle ORM + PostgreSQL, Resend, Stripe (if in scope).`,
      ``,
      `Required outputs (write to BOTH your workspace AND the shared path):`,
      `- ${shared}/API.md — append your endpoints (never overwrite existing entries)`,
      `- ${shared}/schema.ts — canonical schema for all services to reference`,
      `- docker-compose.yml — app + postgres services (if not already exists)`,
      `- .env.example — every env var documented, no real secrets`,
      ``,
      `Schema before routes. Auth before feature routes. Webhooks last.`,
      `All inputs validated with Zod. All secrets via process.env.`,
    )
  } else if (assignee === 'designer') {
    lines.push(
      `Save ALL outputs to BOTH your workspace AND ${shared}/`,
      `Required files: PRODUCT.md, DESIGN.md, tokens.json`,
      `DESIGN.md uses hex (Google Stitch spec). tokens.json uses OKLCH (coder requirement).`,
      `Do not leave PRODUCT.md or DESIGN.md with placeholder text.`,
    )
  } else if (assignee === 'deployer') {
    lines.push(
      `Find the coder's workspace from parent task metadata ("workspace" field).`,
      ``,
      `Required: build the Docker image, run with docker-compose (includes Postgres if present).`,
      ``,
      `MIGRATION GATE (mandatory — do not skip):`,
      `After running migrations, verify DB tables actually exist before claiming success:`,
      `  DB=$(docker ps --format "{{.Names}}" | grep -E "db|postgres" | head -1)`,
      `  docker exec $DB psql -U postgres -c "\\dt" 2>/dev/null | grep -c "table"`,
      `If count is 0: block immediately. Do NOT set migration_status:"applied" if tables are missing.`,
      ``,
      `Smoke test: home 200, auth endpoint exists (not 404), protected route is NOT 200.`,
      ``,
      `Report local_port and env_vars_required in completion metadata.`,
    )
  } else if (assignee === 'reviewer') {
    lines.push(
      `Find the coder workspace from parent task metadata ("workspace" field).`,
      `Find the deployer's local_port from their completion metadata.`,
      ``,
      `Run structural checks FIRST before the main audit:`,
      `1. DB table count > 0 (query the DB container directly)`,
      `2. No bare CSS class names (grep for btn-, badge-, section-spacing, .card)`,
      `3. Layout consistency (all pages use the same Layout component)`,
      `4. Schema consistency across services`,
      `5. Home page is a real page, not a design specimen`,
      `6. API response shapes match what consuming pages expect`,
      ``,
      `Any failure in steps 1-6 = P0 block. Do not proceed to code review.`,
    )
  }

  return lines.filter(Boolean).join('\n')
}

// ─── Build task plan (shared between preview and create) ──────────────────────

type TaskPlanItem = {
  id: string
  title: string
  assignee: string
  tier: number
  skills: string[] | null
  body: string
}

function buildTaskPlan(
  taskTitles: string[],
  project: { id: number; name: string; slug: string; root_path: string | null },
  generateIds: boolean,
): {
  tasksByTier: Record<number, TaskPlanItem[]>
  tiers: number[]
} {
  const tasksByTier: Record<number, TaskPlanItem[]> = {}

  for (const title of taskTitles) {
    const assignee = inferAssignee(title)
    const tier = assigneeTier(assignee)
    const taskId = generateIds
      ? `t_${randomBytes(6).toString('hex')}`
      : `preview_${Math.random().toString(36).slice(2, 8)}`
    const skills = skillsForAssignee(assignee)
    const body = bodyForAssignee(assignee, title, project.name, project.slug)

    if (!tasksByTier[tier]) tasksByTier[tier] = []
    tasksByTier[tier].push({ id: taskId, title, assignee, tier, skills, body })
  }

  const tiers = Object.keys(tasksByTier).map(Number).sort()
  return { tasksByTier, tiers }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  '/api/agency/projects/$id/kanban-sync',
)({
  server: {
    handlers: {
      // GET — dry-run preview (no DB writes)
      GET: async ({ params }) => {
        const db = getAgencyDb()

        const project = db
          .prepare('SELECT id, name, slug, root_path FROM projects WHERE id = ?')
          .get(params.id) as
          | { id: number; name: string; slug: string; root_path: string | null }
          | undefined

        if (!project)
          return json({ error: 'project not found' }, { status: 404 })
        if (!project.slug)
          return json({ error: 'project has no slug' }, { status: 400 })

        const section = db
          .prepare(
            "SELECT content FROM project_sections WHERE project_id = ? AND section = 'spec'",
          )
          .get(params.id) as { content: string } | undefined

        const content = section?.content ?? ''
        const taskTitles = content
          .split('\n')
          .filter(
            (l) =>
              /^[-*]\s+\[[ x]\]/i.test(l) || /^\d+\.\s+\[[ x]\]/i.test(l),
          )
          .map((l) =>
            l.replace(/^[-*\d.]+\s+\[[ x]\]\s*/i, '').trim(),
          )
          .filter(Boolean)

        if (taskTitles.length === 0) {
          return json(
            { error: 'No checkbox tasks found in spec. Add tasks as `- [ ] Task title`.' },
            { status: 400 },
          )
        }

        const { tasksByTier, tiers } = buildTaskPlan(taskTitles, project, false)
        const allTasks = Object.values(tasksByTier).flat()

        return json({
          preview: true,
          tasks: allTasks.map((t) => ({
            title: t.title,
            assignee: t.assignee,
            tier: t.tier,
            skills: t.skills,
          })),
          count: allTasks.length,
          tiers: tiers.map((t) => ({
            tier: t,
            tasks: tasksByTier[t].map((x) => `${x.assignee}: ${x.title}`),
          })),
        })
      },

      // POST — create tasks in kanban.db
      POST: async ({ request, params }) => {
        const db = getAgencyDb()
        const kanban = getKanbanDb()

        const project = db
          .prepare('SELECT id, name, slug, root_path FROM projects WHERE id = ?')
          .get(params.id) as
          | { id: number; name: string; slug: string; root_path: string | null }
          | undefined

        if (!project)
          return json({ error: 'project not found' }, { status: 404 })
        if (!project.slug)
          return json({ error: 'project has no slug' }, { status: 400 })

        const body = await request.json().catch(() => ({}))
        let taskInputs: { title: string; assignee?: string }[] =
          body.tasks ?? []

        if (taskInputs.length === 0) {
          const section = db
            .prepare(
              "SELECT content FROM project_sections WHERE project_id = ? AND section = 'spec'",
            )
            .get(params.id) as { content: string } | undefined

          const content = section?.content ?? ''
          const titles = content
            .split('\n')
            .filter(
              (l) =>
                /^[-*]\s+\[[ x]\]/i.test(l) || /^\d+\.\s+\[[ x]\]/i.test(l),
            )
            .map((l) =>
              l.replace(/^[-*\d.]+\s+\[[ x]\]\s*/i, '').trim(),
            )
            .filter(Boolean)

          if (titles.length === 0) {
          return json(
            { error: 'No checkbox tasks found in spec. Add tasks as `- [ ] Task title`.' },
            { status: 400 },
          )
        }
        taskInputs = titles.map((t) => ({ title: t }))
        }

        const workspaceKind = project.root_path ? 'dir' : 'scratch'
        const workspacePath = project.root_path ?? null
        const now = Math.floor(Date.now() / 1000)

        const tasksByTier: Record<
          number,
          { id: string; title: string; assignee: string; tier: number }[]
        > = {}

        for (const input of taskInputs) {
          const assignee = input.assignee ?? inferAssignee(input.title)
          const tier = assigneeTier(assignee)
          const taskId = `t_${randomBytes(6).toString('hex')}`
          const skills = skillsForAssignee(assignee)
          const taskBody = bodyForAssignee(
            assignee,
            input.title,
            project.name,
            project.slug,
          )

          kanban
            .prepare(
              `INSERT INTO tasks (id, title, body, assignee, status, priority, tenant,
                                  workspace_kind, workspace_path, skills, created_at)
               VALUES (?, ?, ?, ?, 'todo', 0, ?, ?, ?, ?, ?)`,
            )
            .run(
              taskId,
              `[${project.name}] ${input.title}`,
              taskBody,
              assignee,
              project.slug,
              workspaceKind,
              workspacePath,
              skills ? JSON.stringify(skills) : null,
              now,
            )

          if (!tasksByTier[tier]) tasksByTier[tier] = []
          tasksByTier[tier].push({
            id: taskId,
            title: input.title,
            assignee,
            tier,
          })
        }

        // Wire dependency links between tiers
        const tiers = Object.keys(tasksByTier).map(Number).sort()
        for (let i = 1; i < tiers.length; i++) {
          const parentTier = tasksByTier[tiers[i - 1]]
          const childTier = tasksByTier[tiers[i]]
          for (const child of childTier) {
            for (const parent of parentTier) {
              kanban
                .prepare(
                  'INSERT OR IGNORE INTO task_links (parent_id, child_id) VALUES (?, ?)',
                )
                .run(parent.id, child.id)
            }
          }
        }

        // Promote tier-1 tasks to ready
        if (tasksByTier[1]) {
          for (const t of tasksByTier[1]) {
            kanban
              .prepare("UPDATE tasks SET status = 'ready' WHERE id = ?")
              .run(t.id)
          }
        }

        const allCreated = Object.values(tasksByTier).flat()

        // Subscribe all tasks to Discord notifications
        const DISCORD_HOME_CHANNEL = '1494755926627061893'
        const subNow = Math.floor(Date.now() / 1000)
        for (const t of allCreated) {
          kanban
            .prepare(
              `INSERT OR IGNORE INTO kanban_notify_subs
                 (task_id, platform, chat_id, thread_id, created_at, last_event_id)
               VALUES (?, 'discord', ?, '', ?, 0)`,
            )
            .run(t.id, DISCORD_HOME_CHANNEL, subNow)
        }

        return json({
          created: allCreated.map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assignee,
          })),
          count: allCreated.length,
          tenant: project.slug,
          dependency_chains: tiers.map((t) => ({
            tier: t,
            tasks: tasksByTier[t].map((x) => `${x.assignee}: ${x.title}`),
          })),
        })
      },
    },
  },
})
