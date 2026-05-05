'use client'

import { KanbanBoard } from './kanban-board'

export function BoardScreen() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-full">
      <div>
        <h1 className="text-xl font-semibold text-[var(--theme-fg)]">Agency Board</h1>
        <p className="text-sm text-[var(--theme-muted)] mt-0.5">All agentic tasks across all projects</p>
      </div>
      <KanbanBoard />
    </div>
  )
}
