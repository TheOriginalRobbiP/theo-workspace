'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createClient,
  deleteClient,
  fetchClients,
  STATUS_COLORS,
  type Client,
  type ClientStatus,
} from '@/lib/agency-api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const STATUSES: ClientStatus[] = ['prospect', 'active', 'inactive']

export function ClientsScreen() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<ClientStatus>('prospect')
  const [notes, setNotes] = useState('')

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['agency', 'clients'],
    queryFn: fetchClients,
  })

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'clients'] })
      setShowForm(false)
      resetForm()
      toast('Client created')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'clients'] })
      setConfirmDelete(null)
      toast('Client deleted')
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  function resetForm() {
    setName(''); setEmail(''); setCompany(''); setStatus('prospect'); setNotes('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name, email: email || undefined, company: company || undefined, status, notes: notes || undefined })
  }

  const filtered = clients.filter(c =>
    [c.name, c.company, c.email, c.status].filter(Boolean).join(' ').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--theme-fg)]">Clients</h1>
          <p className="text-sm text-[var(--theme-muted)] mt-0.5">{clients.length} total</p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); resetForm() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--theme-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <span>+</span> Add client
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-[var(--theme-border)] rounded-xl p-4 bg-[var(--theme-card)] flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Name *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Smith"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Company</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Ltd"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--theme-muted)]">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ClientStatus)}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--theme-muted)]">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any context..."
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-1.5 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-hover)] transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-3 py-1.5 text-sm rounded-lg bg-[var(--theme-accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
              {createMutation.isPending ? 'Creating...' : 'Create client'}
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter clients..."
        className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-sm text-[var(--theme-fg)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30"
      />

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-[var(--theme-muted)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-[var(--theme-muted)]">No clients found.</div>
      ) : (
        <div className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--theme-hover)] border-b border-[var(--theme-border)]">
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Company</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--theme-muted)]">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: Client, i) => (
                <tr key={c.id} className={cn('border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-hover)] transition-colors', i % 2 === 0 ? 'bg-[var(--theme-card)]' : 'bg-[var(--theme-bg)]')}>
                  <td className="px-4 py-3 font-medium text-[var(--theme-fg)]">
                    <a href={'/agency/clients/' + c.id} className="hover:text-[var(--theme-accent)] transition-colors">
                      {c.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[var(--theme-muted)]">{c.company ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--theme-muted)]">
                    {c.email ? <a href={`mailto:${c.email}`} className="hover:text-[var(--theme-accent)]">{c.email}</a> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600')}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDelete === c.id ? (
                      <span className="inline-flex gap-1">
                        <button onClick={() => deleteMutation.mutate(c.id)} className="text-xs text-red-600 hover:underline">Confirm</button>
                        <span className="text-[var(--theme-muted)]">/</span>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-[var(--theme-muted)] hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDelete(c.id)} className="text-xs text-[var(--theme-muted)] hover:text-red-600 transition-colors">Delete</button>
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
