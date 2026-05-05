'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAgentTasks, STATUS_COLORS, type AgentTask } from '@/lib/agency-api'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { id: 'triage',  label: 'Triage' },
  { id: 'todo',    label: 'Todo' },
  { id: 'ready',   label: 'Ready' },
  { id: 'running', label: 'Running' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done',    label: 'Done' },
]

const ASSIGNEE_COLORS: Record<string, string> = {
  coder:            'bg-blue-100 text-blue-700',
  'backend-coder':  'bg-indigo-100 text-indigo-700',
  designer:         'bg-pink-100 text-pink-700',
  deployer:         'bg-violet-100 text-violet-700',
  writer:           'bg-purple-100 text-purple-700',
  analyst:          'bg-orange-100 text-orange-700',
  reviewer:         'bg-green-100 text-green-700',
  theodore:         'bg-gray-100 text-gray-700',
}

function TaskCard({ task }: { task: AgentTask }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] p-3 cursor-pointer transition-shadow hover:shadow-sm',
        task.kanban_status === 'blocked' && 'border-red-200 bg-red-50/30',
        task.kanban_status === 'running' && 'border-blue-200 bg-blue-50/20',
      )}
      onClick={() => setExpanded(v => !v)}
    >
      <p className="text-xs font-medium text-[var(--theme-fg)] leading-snug line-clamp-2">{task.instruction}</p>

      <div className="flex flex-wrap gap-1 mt-2">
        {task.assignee && (
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', ASSIGNEE_COLORS[task.assignee] ?? 'bg-gray-100 text-gray-600')}>
            {task.assignee}
          </span>
        )}
        {task.kanban_status === 'blocked' && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">blocked</span>
        )}
      </div>

      {expanded && task.last_summary && (
        <p className="mt-2 text-[11px] text-[var(--theme-muted)] border-t border-[var(--theme-border)] pt-2 whitespace-pre-wrap">{task.last_summary}</p>
      )}
    </div>
  )
}

type Props = {
  tenant?: string
  projectName?: string
}

export function KanbanBoard({ tenant, projectName }: Props) {
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['agency', 'tasks', tenant],
    queryFn: () => fetchAgentTasks(tenant),
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return <div className="text-sm text-[var(--theme-muted)] p-4">Loading tasks...</div>
  }

  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[]

  const filtered = tasks.filter(t => {
    if (!showArchived && t.kanban_status === 'archived') return false
    if (assigneeFilter !== 'all' && t.assignee !== assigneeFilter) return false
    return true
  })

  const byColumn = (col: string) => filtered.filter(t => t.kanban_status === col)

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-card)] px-2 py-1 text-xs text-[var(--theme-fg)] outline-none"
        >
          <option value="all">All assignees</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--theme-muted)] cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
          Show archived
        </label>
        <span className="ml-auto text-xs text-[var(--theme-muted)]">{filtered.length} tasks</span>
      </div>

      {/* Board columns */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {COLUMNS.map(col => {
          const colTasks = byColumn(col.id)
          return (
            <div key={col.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-[var(--theme-muted)]">{col.label}</span>
                {colTasks.length > 0 && (
                  <span className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold',
                    col.id === 'blocked' ? 'bg-red-500 text-white' : 'bg-[var(--theme-hover)] text-[var(--theme-muted)]'
                  )}>{colTasks.length}</span>
                )}
              </div>
              <div className="flex flex-col gap-2 min-h-[80px] rounded-xl p-2 bg-[var(--theme-hover)]/40">
                {colTasks.length === 0 ? (
                  <div className="text-center text-[10px] text-[var(--theme-muted)]/40 py-4">empty</div>
                ) : (
                  colTasks.map(t => <TaskCard key={t.id} task={t} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
