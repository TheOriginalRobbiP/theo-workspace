'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  fetchClients,
  fetchProjects,
  updateClient,
  STATUS_COLORS,
  type Client,
  type ClientStatus,
} from '@/lib/agency-api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const STATUSES: ClientStatus[] = ['prospect', 'active', 'inactive']

type EditableField = 'name' | 'email' | 'company' | 'status' | 'notes'

export function ClientDetailScreen({ id }: { id: number }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<EditableField | null>(null)
  const [draft, setDraft] = useState<string>('')

  const { data: clients = [] } = useQuery({
    queryKey: ['agency', 'clients'],
    queryFn: fetchClients,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['agency', 'projects'],
    queryFn: fetchProjects,
  })

  const client = clients.find(c => c.id === id)
  const clientProjects = projects.filter(p => p.client_id === id)

  const updateMutation = useMutation({
    mutationFn: ({ field, value }: { field: EditableField; value: string }) =>
      updateClient(id, { [field]: value || null } as Partial<Client>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'clients'] })
      setEditing(null)
      toast('Saved')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  function startEdit(field: EditableField, current: string | null) {
    setEditing(field)
    setDraft(current ?? '')
  }

  function saveEdit() {
    if (!editing) return
    updateMutation.mutate({ field: editing, value: draft })
  }

  function cancelEdit() {
    setEditing(null)
    setDraft('')
  }

  if (!client) {
    return (
      <div className="p-6 text-[var(--theme-muted)] text-sm">
        {clients.length === 0 ? 'Loading...' : 'Client not found.'}
      </div>
    )
  }

  function Field({ label, field, value, type = 'text' }: { label: string; field: EditableField; value: string | null; type?: string }) {
    const isEditing = editing === field
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--theme-muted)]">{label}</label>
        {isEditing ? (
          <div className="flex gap-2 items-start">
            {field === 'notes' ? (
              <textarea
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={3}
                className="flex-1 rounded-lg border border-[var(--theme-accent)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none resize-none"
              />
            ) : field === 'status' ? (
              <select
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--theme-accent)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                autoFocus
                type={type}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--theme-accent)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none"
              />
            )}
            <div className="flex gap-1">
              <button onClick={saveEdit} disabled={updateMutation.isPending} className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--theme-accent)] text-white hover:opacity-90 disabled:opacity-50">Save</button>
              <button onClick={cancelEdit} className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]">Cancel</button>
            </div>
          </div>
        ) : (
          <div
            className="group flex items-start gap-2 cursor-pointer rounded-lg px-3 py-1.5 hover:bg-[var(--theme-hover)] transition-colors"
            onClick={() => startEdit(field, value)}
          >
            {field === 'status' ? (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[value ?? ''] ?? 'bg-gray-100 text-gray-600')}>
                {value ?? '—'}
              </span>
            ) : field === 'email' && value ? (
              <a href={`mailto:${value}`} className="text-sm text-[var(--theme-accent)] hover:underline" onClick={e => e.stopPropagation()}>{value}</a>
            ) : (
              <span className="text-sm text-[var(--theme-fg)] whitespace-pre-wrap">{value || <span className="text-[var(--theme-muted)]">—</span>}</span>
            )}
            <span className="ml-auto text-xs text-[var(--theme-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">Edit</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--theme-muted)]">
        <a href="/agency/clients" className="hover:text-[var(--theme-fg)] transition-colors">Clients</a>
        <span>/</span>
        <span className="text-[var(--theme-fg)]">{client.name}</span>
      </div>

      {/* Client fields */}
      <div className="border border-[var(--theme-border)] rounded-xl p-5 bg-[var(--theme-card)] flex flex-col gap-4">
        <h2 className="text-sm font-medium text-[var(--theme-muted)] uppercase tracking-wide">Details</h2>
        <Field label="Name" field="name" value={client.name} />
        <Field label="Company" field="company" value={client.company} />
        <Field label="Email" field="email" value={client.email} type="email" />
        <Field label="Status" field="status" value={client.status} />
        <Field label="Notes" field="notes" value={client.notes} />
      </div>

      {/* Linked projects */}
      <div className="border border-[var(--theme-border)] rounded-xl p-5 bg-[var(--theme-card)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--theme-muted)] uppercase tracking-wide">Projects</h2>
          <a href="/agency/projects" className="text-xs text-[var(--theme-accent)] hover:underline">View all</a>
        </div>
        {clientProjects.length === 0 ? (
          <p className="text-sm text-[var(--theme-muted)]">No projects linked to this client.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientProjects.map(p => (
              <a
                key={p.id}
                href={'/agency/projects/' + p.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 border border-[var(--theme-border)] hover:bg-[var(--theme-hover)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--theme-fg)]">{p.name}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600')}>{p.status}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
