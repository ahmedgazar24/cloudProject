import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import { cn, getStatus } from '../../lib/utils'

const colStyles = {
  TODO:        'border-t-surface-300',
  IN_PROGRESS: 'border-t-blue-500',
  IN_REVIEW:   'border-t-amber-500',
  DONE:        'border-t-emerald-500',
}

const colBadgeStyles = {
  TODO:        'bg-surface-100 text-surface-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  IN_REVIEW:   'bg-amber-50 text-amber-700',
  DONE:        'bg-emerald-50 text-emerald-700',
}

export default function KanbanColumn({ status, tasks, onTaskClick, onAddTask, canAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const info = getStatus(status)

  return (
    <div className="flex flex-col min-w-[270px] max-w-[270px]">
      {/* Column header */}
      <div className={cn('bg-white rounded-t-2xl border border-surface-200 border-b-0 border-t-2 px-4 py-3 flex items-center justify-between', colStyles[status])}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-surface-800">{info.label}</span>
          <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-lg text-[10px] font-bold', colBadgeStyles[status])}>
            {tasks.length}
          </span>
        </div>
        {canAdd && (
          <button onClick={() => onAddTask(status)} className="btn-ghost rounded-lg p-1 text-surface-400 hover:text-brand-600">
            <Plus size={15} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 bg-white border-x border-b border-surface-200 rounded-b-2xl p-3 min-h-[400px] transition-colors duration-100',
          isOver && 'bg-brand-50/60'
        )}
      >
        <SortableContext items={tasks.map(t => t.taskId)} strategy={verticalListSortingStrategy}>
          <div className="kanban-col">
            {tasks.map(task => (
              <TaskCard key={task.taskId} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-surface-200 rounded-xl">
            <p className="text-xs text-surface-400">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  )
}
