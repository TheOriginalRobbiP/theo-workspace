'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchAgencyDashboard, formatCost, fetchCost } from '@/lib/agency-api'
import { cn } from '@/lib/utils'

export function AgencyHomeScreen() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['agency', 'dashboard'],
    queryFn: fetchAgencyDashboard,
    refetchInterval: 30_000,
  })

  const { data: cost } = useQuery({
    queryKey: ['agency', 'cost', 30],
    queryFn: () => fetchCost(30),
  })

  const cards = [
    { label: 'Active clients', value: stats?.clients ?? '—', href: '/agency/clients', color: 'bg-blue-500' },
    { label: 'Active projects', value: stats?.projects ?? '—', href: '/agency/projects', color: 'bg-violet-500' },
    {
      label: 'Open tasks',
      value: stats?.open_tasks ?? '—',
      href: '/agency/board',
      color: (stats?.blocked_tasks ?? 0) > 0 ? 'bg-red-500' : 'bg-green-500',
      badge: (stats?.blocked_tasks ?? 0) > 0 ? `${stats?.blocked_tasks} blocked` : undefined,
    },
    { label: '30d AI spend', value: cost ? formatCost(cost.total.cost_usd) : '—', href: '/agency/cost', color: 'bg-orange-500' },
  ]

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--theme-fg)]">Agency</h1>
        <p className="text-sm text-[var(--theme-muted)] mt-1">Clients, projects, agentic execution, and cost tracking</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <a
            key={card.label}
            href={card.href}
            className="group flex flex-col gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 hover:shadow-md transition-all"
          >
            <div className={cn('w-2 h-2 rounded-full', card.color)} />
            <div>
              <p className="text-2xl font-semibold font-mono text-[var(--theme-fg)]">{isLoading ? '...' : card.value}</p>
              <p className="text-xs text-[var(--theme-muted)] mt-0.5">{card.label}</p>
              {card.badge && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">{card.badge}</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Clients', desc: 'CRM & contacts', href: '/agency/clients' },
          { label: 'Projects', desc: 'Spec, kanban, deploy', href: '/agency/projects' },
          { label: 'Board', desc: 'Global agentic kanban', href: '/agency/board' },
          { label: 'Cost', desc: 'AI spend tracking', href: '/agency/cost' },
        ].map(link => (
          <a
            key={link.label}
            href={link.href}
            className="flex flex-col gap-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-card)] p-4 hover:bg-[var(--theme-hover)] hover:border-[var(--theme-accent)]/30 transition-all"
          >
            <span className="text-sm font-medium text-[var(--theme-fg)]">{link.label}</span>
            <span className="text-xs text-[var(--theme-muted)]">{link.desc}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
