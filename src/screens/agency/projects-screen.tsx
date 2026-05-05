'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProject,
  deleteProject,
  fetchClients,
  fetchProjects,
  STATUS_COLORS,
  type ProjectStatus,
} from '@/lib/agency-api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const STATUSES: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

export function ProjectsScreen() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [githubUrl, setGithubUrl] = useState('')
  const [deployUrl, setDeployUrl] = useState('')

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['agency', 'projects'],
    queryFn: fetchProjects,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['agency', 'clients'],
    queryFn: fetchClients,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'projects'] })
      setShowForm(false)
      resetForm()
      toast('Project created')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'projects'] })
      setConfirmDelete(null)
      toast('Project deleted')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  function resetForm() {
    setName(''); setSlug(''); setClientId(''); setStatus('active'); setGithubUrl(''); setDeployUrl('')
  }

  function handleNameChange(v: string) {
    setName(v)
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({
      name,
      slug: slug || undefined,
      client_id: clientId ? Number(clientId) : undefined,
      status,
      github_url: githubUrl || undefined,
      deploy_url: deployUrl || undefined,
    })
  }

  const filtered = projects.filter(p =>
    [p.name, p.slug, p.client_name, p.status].filter(Boolean).join(' ').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--theme-fg)]">Projects</h1>
          <p className="text-sm text-[var(--theme-muted)] mt-0.5">{projects.length} total</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); resetForm() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <span>+</span> New project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-[var(--theme-border)] rounded-xl p-4 bg-[var(--theme-card)] flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Name *</label>
              <input required value={name} onChange={e => handleNameChange(e.target.value)} placeholder="My Project" className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="my-project" className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 font-mono" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30">
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ProjectStatus)} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">GitHub URL</label>
              <input type="url" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} placeholder="https://github.com/..." className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Deploy URL</label>
              <input type="url" value={deployUrl} onChange={e => setDeployUrl(e.target.value)} placeholder="https://..." className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--theme-accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {createMutation.isPending ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      )}

      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter projects..."
        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
      />

      {isLoading ? (
        <div className="text-sm text-[var(--theme-muted)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-[var(--theme-muted)]">No projects found.</div>
      ) : (
        <div className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--theme-hover)] border-b border-[var(--theme-border)]">
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Client</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Links</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={cn('border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-hover)] transition-colors', i % 2 === 0 ? 'bg-[var(--theme-card)]' : 'bg-[var(--theme-bg)]')}>
                  <td className="px-4 py-3">
                    <a href={'/agency/projects/' + p.id} className="font-medium text-[var(--theme-fg)] hover:text-[var(--theme-accent)] transition-colors">
                      {p.name}
                    </a>
                    <div className="text-xs text-[var(--theme-muted)] font-mono mt-0.5">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-muted)]">{p.client_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600')}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--theme-accent)] hover:underline">GitHub</a>}
                      {p.deploy_url && <a href={p.deploy_url} target="_blank" rel="noreferrer" className="text-xs text-[var(--theme-accent)] hover:underline">Deploy</a>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === p.id ? (
                      <span className="inline-flex gap-1">
                        <button onClick={() => deleteMutation.mutate(p.id)} className="text-xs text-red-600 hover:underline">Confirm</button>
                        <span className="text-[var(--theme-muted)]">/</span>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-[var(--theme-muted)] hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(p.id)} className="text-xs text-[var(--theme-muted)] hover:text-red-600 transition-colors">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
