'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCost, formatCost } from '@/lib/agency-api'
import { cn } from '@/lib/utils'

export function CostScreen() {
  const [days, setDays] = useState(30)

  const { data, isLoading, error } = useQuery({
    queryKey: ['agency', 'cost', days],
    queryFn: () => fetchCost(days),
  })

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--theme-fg)]">Cost Tracking</h1>
          <p className="text-sm text-[var(--theme-muted)] mt-0.5">AI spend across all profiles and projects</p>
        </div>
        <div className="flex gap-1 border border-[var(--theme-border)] rounded-lg p-0.5 bg-[var(--theme-card)]">
          {[30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                days === d
                  ? 'bg-[var(--theme-accent)] text-white font-medium'
                  : 'text-[var(--theme-muted)] hover:bg-[var(--theme-hover)]',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-sm text-[var(--theme-muted)]">Loading...</div>}
      {error && <div className="text-sm text-red-600">{(error as Error).message}</div>}

      {data && (
        <>
          {/* Total summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total spend', value: formatCost(data.total.cost_usd), accent: true },
              { label: 'Sessions', value: data.total.sessions.toLocaleString() },
              { label: 'Input tokens', value: (data.total.input_tokens / 1000).toFixed(1) + 'k' },
              { label: 'Output tokens', value: (data.total.output_tokens / 1000).toFixed(1) + 'k' },
            ].map(stat => (
              <div key={stat.label} className={cn('rounded-xl border border-[var(--theme-border)] p-4', stat.accent ? 'bg-[var(--theme-accent)]/5' : 'bg-[var(--theme-card)]')}>
                <p className="text-xs text-[var(--theme-muted)] mb-1">{stat.label}</p>
                <p className={cn('text-2xl font-semibold font-mono', stat.accent ? 'text-[var(--theme-accent)]' : 'text-[var(--theme-fg)]')}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* By profile */}
          {data.by_profile.length > 0 && (
            <div className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[var(--theme-hover)] border-b border-[var(--theme-border)]">
                <span className="text-sm font-medium text-[var(--theme-fg)]">By profile</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--theme-border)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Profile</th>
                    <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Model</th>
                    <th className="text-right px-4 py-2 font-medium text-[var(--theme-muted)]">Sessions</th>
                    <th className="text-right px-4 py-2 font-medium text-[var(--theme-muted)]">Spend</th>
                    <th className="px-4 py-2 w-32" />
                  </tr>
                </thead>
                <tbody>
                  {data.by_profile.map(p => {
                    const pct = data.total.cost_usd > 0 ? (p.cost_usd / data.total.cost_usd) * 100 : 0
                    return (
                      <tr key={p.profile} className="border-b border-[var(--theme-border)] last:border-0 bg-[var(--theme-card)] hover:bg-[var(--theme-hover)]">
                        <td className="px-4 py-3 font-medium text-[var(--theme-fg)]">{p.profile}</td>
                        <td className="px-4 py-3 text-[var(--theme-muted)] text-xs font-mono">{p.model}</td>
                        <td className="px-4 py-3 text-right text-[var(--theme-muted)]">{p.sessions}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-[var(--theme-fg)]">{formatCost(p.cost_usd)}</td>
                        <td className="px-4 py-3">
                          <div className="h-1.5 rounded-full bg-[var(--theme-hover)] overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--theme-accent)]" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* By project */}
          {data.by_project.length > 0 && (
            <div className="border border-[var(--theme-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[var(--theme-hover)] border-b border-[var(--theme-border)]">
                <span className="text-sm font-medium text-[var(--theme-fg)]">By project</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--theme-border)]">
                    <th className="text-left px-4 py-2 font-medium text-[var(--theme-muted)]">Project</th>
                    <th className="text-right px-4 py-2 font-medium text-[var(--theme-muted)]">Sessions</th>
                    <th className="text-right px-4 py-2 font-medium text-[var(--theme-muted)]">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_project.map(p => (
                    <tr key={p.tenant} className="border-b border-[var(--theme-border)] last:border-0 bg-[var(--theme-card)] hover:bg-[var(--theme-hover)]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--theme-fg)]">{p.project_name ?? p.tenant}</div>
                        <div className="text-xs text-[var(--theme-muted)] font-mono">{p.tenant}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--theme-muted)]">{p.sessions}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--theme-fg)]">{formatCost(p.cost_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.by_profile.length === 0 && data.by_project.length === 0 && (
            <div className="text-sm text-[var(--theme-muted)] text-center py-8">
              No data for this period. Are profiles at <code className="text-xs bg-[var(--theme-hover)] px-1 rounded">/opt/data/profiles</code>?
            </div>
          )}
        </>
      )}
    </div>
  )
}
