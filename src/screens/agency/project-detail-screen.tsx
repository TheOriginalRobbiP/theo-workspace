'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchProject,
  fetchSections,
  upsertSection,
  fetchKanbanPreview,
  confirmKanbanSync,
  fetchAgentTasks,
  fetchCost,
  STATUS_COLORS,
  formatCost,
  type KanbanPreviewTask,
} from '@/lib/agency-api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { KanbanBoard } from './kanban-board'

type Tab = 'kanban' | 'spec' | 'design' | 'dev' | 'seo'
const TABS: { id: Tab; label: string }[] = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'spec', label: 'Spec' },
  { id: 'design', label: 'Design' },
  { id: 'dev', label: 'Dev' },
  { id: 'seo', label: 'SEO' },
]

const ASSIGNEE_OPTIONS = [
  'coder', 'backend-coder', 'designer', 'writer',
  'analyst', 'reviewer', 'deployer',
]

export function ProjectDetailScreen({ id }: { id: number }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('kanban')

  // Section editing
  const [sectionDraft, setSectionDraft] = useState<Record<string, string>>({})
  const [sectionDirty, setSectionDirty] = useState<Record<string, boolean>>({})

  // Kanban sync state
  const [syncStep, setSyncStep] = useState<'idle' | 'preview' | 'confirm'>('idle')
  const [previewTasks, setPreviewTasks] = useState<KanbanPreviewTask[]>([])
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<number, string>>({})

  // Cost period
  const [costDays, setCostDays] = useState(30)

  const projectQuery = useQuery({
    queryKey: ['agency', 'project', id],
    queryFn: () => fetchProject(id),
  })

  const sectionsQuery = useQuery({
    queryKey: ['agency', 'sections', id],
    queryFn: () => fetchSections(id),
  })

  const tasksQuery = useQuery({
    queryKey: ['agency', 'tasks', projectQuery.data?.slug],
    queryFn: () => fetchAgentTasks(projectQuery.data?.slug),
    enabled: !!projectQuery.data?.slug,
  })

  const costQuery = useQuery({
    queryKey: ['agency', 'cost', costDays, projectQuery.data?.slug],
    queryFn: () => fetchCost(costDays, projectQuery.data?.slug),
    enabled: tab === 'kanban' && !!projectQuery.data?.slug,
  })

  const saveSectionMutation = useMutation({
    mutationFn: ({ section, content }: { section: string; content: string }) =>
      upsertSection(id, section, content),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['agency', 'sections', id] })
      setSectionDirty(d => ({ ...d, [vars.section]: false }))
      toast('Saved')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const previewMutation = useMutation({
    mutationFn: () => fetchKanbanPreview(id),
    onSuccess: (data) => {
      setPreviewTasks(data.tasks)
      setSyncStep('preview')
      const overrides: Record<number, string> = {}
      data.tasks.forEach((t, i) => { overrides[i] = t.assignee })
      setAssigneeOverrides(overrides)
    },
    onError: (e: Error) => toast('Preview failed: ' + e.message, { type: 'error' }),
  })

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmKanbanSync(id, previewTasks.map((t, i) => ({ title: t.title, assignee: assigneeOverrides[i] }))),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['agency', 'tasks'] })
      setSyncStep('idle')
      setPreviewTasks([])
      toast(`Created ${data.count} tasks (${data.tenant})`)
    },
    onError: (e: Error) => toast('Sync failed: ' + e.message, { type: 'error' }),
  })

  const project = projectQuery.data
  const sections = sectionsQuery.data ?? []

  function getSectionContent(sectionId: string): string {
    if (sectionId in sectionDraft) return sectionDraft[sectionId]
    return sections.find(s => s.section === sectionId)?.content ?? ''
  }

  function handleSectionChange(sectionId: string, value: string) {
    setSectionDraft(d => ({ ...d, [sectionId]: value }))
    setSectionDirty(d => ({ ...d, [sectionId]: true }))
  }

  const blockedCount = (tasksQuery.data ?? []).filter(t => t.kanban_status === 'blocked').length
  const projectCost = costQuery.data?.by_project?.[0]?.cost_usd ?? 0

  if (!project) {
    return (
      <div className="p-6 text-[var(--theme-muted)] text-sm">
        {projectQuery.isLoading ? 'Loading...' : 'Project not found.'}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] px-6 py-4 bg-[var(--theme-card)]">
        <div className="flex items-center gap-2 text-sm text-[var(--theme-muted)] mb-2">
          <a href="/agency/projects" className="hover:text-[var(--theme-fg)] transition-colors">Projects</a>
          <span>/</span>
          <span className="text-[var(--theme-fg)]">{project.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-[var(--theme-fg)]">{project.name}</h1>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600')}>{project.status}</span>
          {project.github_url && <a href={project.github_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--theme-accent)] hover:underline">GitHub</a>}
          {project.deploy_url && <a href={project.deploy_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--theme-accent)] hover:underline">Deploy</a>}
        </div>
        {project.client_name && (
          <p className="text-sm text-[var(--theme-muted)] mt-1">{project.client_name}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--theme-border)] px-6 bg-[var(--theme-card)] flex gap-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors border-b-2',
              tab === t.id
                ? 'border-[var(--theme-accent)] text-[var(--theme-accent)]'
                : 'border-transparent text-[var(--theme-muted)] hover:text-[var(--theme-fg)]',
            )}
          >
            {t.label}
            {t.id === 'kanban' && blockedCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">{blockedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {tab === 'kanban' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Cost strip */}
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)]">
              <span className="text-xs text-[var(--theme-muted)]">AI spend</span>
              <div className="flex gap-1">
                {[30, 60, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setCostDays(d)}
                    className={cn('px-2 py-0.5 rounded text-xs transition-colors', costDays === d ? 'bg-[var(--theme-accent)] text-white' : 'text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]')}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <span className="font-mono font-semibold text-sm text-[var(--theme-fg)]">
                {costQuery.isLoading ? '...' : formatCost(projectCost)}
              </span>
            </div>

            {/* Sync controls */}
            {syncStep === 'idle' && (
              <button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] text-sm text-[var(--theme-fg)] hover:bg-[var(--theme-hover)] disabled:opacity-50 transition-colors"
              >
                {previewMutation.isPending ? 'Loading preview...' : 'Sync Spec → Kanban'}
              </button>
            )}

            {syncStep === 'preview' && previewTasks.length > 0 && (
              <div className="border border-[var(--theme-border)] rounded-xl overflow-hidden bg-[var(--theme-card)]">
                <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--theme-fg)]">Preview — {previewTasks.length} tasks</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSyncStep('idle')} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]">Cancel</button>
                    <button
                      onClick={() => confirmMutation.mutate()}
                      disabled={confirmMutation.isPending}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--theme-accent)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {confirmMutation.isPending ? 'Creating...' : 'Confirm & create'}
                    </button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--theme-hover)] border-b border-[var(--theme-border)]">
                      <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Task</th>
                      <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Assignee</th>
                      <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTasks.map((t, i) => (
                      <tr key={i} className="border-b border-[var(--theme-border)] last:border-0">
                        <td className="px-4 py-2 text-[var(--theme-fg)]">{t.title}</td>
                        <td className="px-4 py-2">
                          <select
                            value={assigneeOverrides[i] ?? t.assignee}
                            onChange={e => setAssigneeOverrides(o => ({ ...o, [i]: e.target.value }))}
                            className="rounded border border-[var(--theme-border)] bg-[var(--theme-bg)] px-2 py-0.5 text-xs text-[var(--theme-fg)] outline-none"
                          >
                            {ASSIGNEE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-[var(--theme-muted)] text-xs">{t.tier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Kanban board */}
            {project.slug && (
              <KanbanBoard tenant={project.slug} projectName={project.name} />
            )}
          </div>
        )}

        {(tab === 'spec' || tab === 'design' || tab === 'dev' || tab === 'seo') && (
          <div className="p-4 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--theme-fg)] capitalize">{tab}</span>
              {sectionDirty[tab] && (
                <button
                  onClick={() => saveSectionMutation.mutate({ section: tab, content: getSectionContent(tab) })}
                  disabled={saveSectionMutation.isPending}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--theme-accent)] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saveSectionMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
            <textarea
              value={getSectionContent(tab)}
              onChange={e => handleSectionChange(tab, e.target.value)}
              placeholder={tab === 'spec' ? '# Project Spec\n\nAdd tasks as:\n- [ ] Task title\n- [ ] Another task' : `${tab} notes...`}
              className="flex-1 min-h-[60vh] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-4 py-3 text-sm text-[var(--theme-fg)] font-mono outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 resize-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}
