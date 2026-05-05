'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSoulProfiles, saveSoulProfile, type AgentProfile } from '@/lib/agency-api'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

function AgentProfileCard({ profile }: { profile: AgentProfile }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile.soul ?? '')

  const saveMutation = useMutation({
    mutationFn: () => saveSoulProfile(profile.name, draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agency', 'soul'] })
      setEditing(false)
      toast(`${profile.name} SOUL.md saved`)
    },
    onError: (e: Error) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] overflow-hidden">
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--theme-card2)] transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold', profile.color)}>
          {profile.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--theme-text)]">{profile.name}</span>
            <span className="text-xs text-[var(--theme-muted)]">{profile.role}</span>
          </div>
          <div className="text-xs text-[var(--theme-muted)] font-mono mt-0.5">{profile.model}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {profile.hasSoul ? (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">SOUL.md</span>
          ) : (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">no soul</span>
          )}
          {profile.error && (
            <span className="text-xs text-amber-600">⚠</span>
          )}
          <span className="text-xs text-[var(--theme-muted)]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[var(--theme-border)] px-4 py-3 flex flex-col gap-3">
          {profile.error && (
            <p className="text-xs text-amber-600">{profile.error}</p>
          )}

          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] px-3 py-2 text-xs font-mono text-[var(--theme-text)] outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/30 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setEditing(false); setDraft(profile.soul ?? '') }}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-card2)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[var(--theme-accent)] text-primary-950 hover:bg-[var(--theme-accent-strong)] disabled:opacity-50 transition-colors"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save SOUL.md'}
                </button>
              </div>
            </>
          ) : (
            <>
              {profile.soul ? (
                <pre className="text-[11px] text-[var(--theme-muted)] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto bg-[var(--theme-card)] rounded-xl px-3 py-2 border border-[var(--theme-border)]">
                  {profile.soul}
                </pre>
              ) : (
                <p className="text-xs text-[var(--theme-muted)]">No SOUL.md found for this profile.</p>
              )}
              {!profile.error && (
                <button
                  type="button"
                  onClick={() => { setEditing(true); setDraft(profile.soul ?? '') }}
                  className="self-start px-3 py-1.5 text-xs rounded-lg border border-[var(--theme-border)] text-[var(--theme-muted)] hover:bg-[var(--theme-card2)] transition-colors"
                >
                  Edit SOUL.md
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function SoulProfilesSection() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['agency', 'soul'],
    queryFn: fetchSoulProfiles,
  })

  return (
    <section className="rounded-3xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-5 shadow-[0_24px_80px_var(--theme-shadow)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--theme-text)]">Agent Profiles</h2>
        <p className="mt-1 text-sm text-[var(--theme-muted-2)]">
          View and edit SOUL.md for each Hermes profile
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-[var(--theme-muted)]">Loading profiles...</div>
      ) : profiles.length === 0 ? (
        <div className="text-sm text-[var(--theme-muted)]">No profiles found. Check HERMES_PROFILES_DIR.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {profiles.map(p => (
            <AgentProfileCard key={p.name} profile={p} />
          ))}
        </div>
      )}
    </section>
  )
}
