'use client'

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { fetchAgencyDashboard, fetchCost, formatCost } from '@/lib/agency-api'
import { cn } from '@/lib/utils'

export function AgencyWidget() {
  const { data: stats } = useQuery({
    queryKey: ['agency', 'dashboard'],
    queryFn: fetchAgencyDashboard,
    refetchInterval: 60_000,
  })

  const { data: cost } = useQuery({
    queryKey: ['agency', 'cost', 30],
    queryFn: () => fetchCost(30),
  })

  const hasBlocked = (stats?.blocked_tasks ?? 0) > 0

  const statRows = [
    { label: 'Clients', value: stats?.clients ?? '—', to: '/agency/clients' as const },
    { label: 'Projects', value: stats?.projects ?? '—', to: '/agency/projects' as const },
    {
      label: 'Open tasks',
      value: stats?.open_tasks ?? '—',
      to: '/agency/board' as const,
      warning: hasBlocked ? `${stats?.blocked_tasks} blocked` : undefined,
    },
    { label: '30d spend', value: cost ? formatCost(cost.total.cost_usd) : '—', to: '/agency/cost' as const, mono: true },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--theme-text)]">Agency</span>
        <Link to="/agency/" className="text-xs text-[var(--theme-accent)] hover:underline">
          Open →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {statRows.map(row => (
          <Link
            key={row.label}
            to={row.to}
            className="flex flex-col gap-0.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 hover:bg-[var(--theme-card2)] transition-colors"
          >
            <span className={cn('text-lg font-semibold', row.mono ? 'font-mono' : '', hasBlocked && row.label === 'Open tasks' ? 'text-red-600' : 'text-[var(--theme-text)]')}>
              {row.value}
            </span>
            <span className="text-[10px] text-[var(--theme-muted)]">{row.label}</span>
            {row.warning && (
              <span className="text-[10px] text-red-600 font-medium">{row.warning}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
