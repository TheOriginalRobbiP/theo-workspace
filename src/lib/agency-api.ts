/**
 * agency-api.ts — Client-side fetch helpers for the /api/agency/* routes.
 * All functions return typed data or throw on non-ok responses.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClientStatus = 'prospect' | 'active' | 'inactive'

export type Client = {
  id: number
  name: string
  email: string | null
  company: string | null
  status: ClientStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'archived'

export type Project = {
  id: number
  client_id: number | null
  client_name: string | null
  name: string
  slug: string
  status: ProjectStatus
  github_url: string | null
  deploy_url: string | null
  notes: string | null
  root_path: string | null
  created_at: string
  updated_at: string
}

export type ProjectSection = {
  section: string
  content: string
  updated_at: string
}

export type KanbanPreviewTask = {
  title: string
  assignee: string
  tier: number
  skills: string[] | null
}

export type KanbanSyncPreview = {
  preview: true
  tasks: KanbanPreviewTask[]
  count: number
  tiers: { tier: number; tasks: string[] }[]
}

export type KanbanSyncResult = {
  created: { id: string; title: string; assignee: string }[]
  count: number
  tenant: string
  dependency_chains: { tier: number; tasks: string[] }[]
}

export type AgentTask = {
  id: string
  kanban_id: string
  instruction: string
  body: string | null
  status: string
  kanban_status: string
  assignee: string | null
  tenant: string | null
  project_name: string | null
  project_id: number | null
  priority: number
  result: string | null
  last_summary: string | null
  last_outcome: string | null
  workspace_kind: string | null
  workspace_path: string | null
  created_at: string
  updated_at: string
}

export type AgentProfile = {
  name: string
  model: string
  role: string
  color: string
  hasSoul: boolean
  soul: string | null
  configModel: string | null
  profilePath: string | null
  error?: string
}

export type AgencyDashboardStats = {
  clients: number
  projects: number
  open_tasks: number
  blocked_tasks: number
}

export type CostData = {
  period_days: number
  total: {
    cost_usd: number
    input_tokens: number
    output_tokens: number
    sessions: number
  }
  by_profile: {
    profile: string
    sessions: number
    input_tokens: number
    output_tokens: number
    cost_usd: number
    model: string
  }[]
  by_project: {
    tenant: string
    project_name: string | null
    cost_usd: number
    input_tokens: number
    output_tokens: number
    sessions: number
    by_profile: Record<string, { cost_usd: number; sessions: number }>
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const fetchClients = () =>
  apiFetch<Client[]>('/api/agency/clients')

export const createClient = (data: {
  name: string
  email?: string
  company?: string
  status?: ClientStatus
  notes?: string
}) =>
  apiFetch<Client>('/api/agency/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const updateClient = (id: number, data: Partial<Client>) =>
  apiFetch<Client>(`/api/agency/clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const deleteClient = (id: number) =>
  apiFetch<{ ok: boolean }>(`/api/agency/clients/${id}`, {
    method: 'DELETE',
  })

// ── Projects ──────────────────────────────────────────────────────────────────

export const fetchProjects = () =>
  apiFetch<Project[]>('/api/agency/projects')

export const fetchProject = (id: number) =>
  apiFetch<Project>(`/api/agency/projects/${id}`)

export const createProject = (data: {
  name: string
  slug?: string
  client_id?: number
  status?: ProjectStatus
  github_url?: string
  deploy_url?: string
  notes?: string
}) =>
  apiFetch<Project>('/api/agency/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const updateProject = (id: number, data: Partial<Project>) =>
  apiFetch<Project>(`/api/agency/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

export const deleteProject = (id: number) =>
  apiFetch<{ ok: boolean }>(`/api/agency/projects/${id}`, {
    method: 'DELETE',
  })

// ── Project sections ──────────────────────────────────────────────────────────

export const fetchSections = (projectId: number) =>
  apiFetch<ProjectSection[]>(`/api/agency/projects/${projectId}/sections`)

export const upsertSection = (
  projectId: number,
  section: string,
  content: string,
) =>
  apiFetch<{ ok: boolean }>(`/api/agency/projects/${projectId}/sections`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, content }),
  })

export const importSpec = (projectId: number) =>
  apiFetch<{ ok: boolean; files: string[]; tasks_found: boolean; tasks: string }>(
    `/api/agency/projects/${projectId}/sections`,
    { method: 'POST' },
  )

// ── Kanban sync ───────────────────────────────────────────────────────────────

export const fetchKanbanPreview = (projectId: number) =>
  apiFetch<KanbanSyncPreview>(
    `/api/agency/projects/${projectId}/kanban-sync`,
  )

export const confirmKanbanSync = (
  projectId: number,
  tasks?: { title: string; assignee?: string }[],
) =>
  apiFetch<KanbanSyncResult>(
    `/api/agency/projects/${projectId}/kanban-sync`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    },
  )

// ── Agent tasks ───────────────────────────────────────────────────────────────

export const fetchAgentTasks = (tenant?: string) =>
  apiFetch<AgentTask[]>(
    tenant ? `/api/agency/agents?tenant=${tenant}` : '/api/agency/agents',
  )

export const createAgentTask = (data: {
  instruction: string
  project_id?: number
  assignee?: string
  body?: string
  priority?: number
  workspace_kind?: string
  workspace_path?: string
}) =>
  apiFetch<AgentTask>('/api/agency/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

// ── Soul / agent profiles ─────────────────────────────────────────────────────

export const fetchSoulProfiles = () =>
  apiFetch<AgentProfile[]>('/api/agency/soul')

export const fetchSoulProfile = (profile: string) =>
  apiFetch<{ profile: string; soul: string; path: string }>(
    `/api/agency/soul/${profile}`,
  )

export const saveSoulProfile = (profile: string, soul: string) =>
  apiFetch<{ ok: boolean; path: string }>(`/api/agency/soul/${profile}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soul }),
  })

// ── Cost ──────────────────────────────────────────────────────────────────────

export const fetchCost = (days = 30, tenant?: string) => {
  const url = tenant
    ? `/api/agency/cost?days=${days}&tenant=${tenant}`
    : `/api/agency/cost?days=${days}`
  return apiFetch<CostData>(url)
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export const fetchAgencyDashboard = () =>
  apiFetch<AgencyDashboardStats>('/api/agency/dashboard')

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

export const STATUS_COLORS: Record<string, string> = {
  // Client statuses
  prospect: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  // Project statuses
  completed: 'bg-blue-100 text-blue-700',
  paused: 'bg-orange-100 text-orange-700',
  archived: 'bg-gray-100 text-gray-500',
  // Task statuses
  pending: 'bg-gray-100 text-gray-700',
  ready: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}
