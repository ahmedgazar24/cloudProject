import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageSquare, Paperclip, Calendar, AlertCircle } from 'lucide-react'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { cn, getPriority, fmtDate, isOverdue, isDueToday, truncate } from '../../lib/utils'

const priorityDot = {
  LOW:      'bg-slate-400',
  MEDIUM:   'bg-yellow-400',
  HIGH:     'bg-orange-500',
  CRITICAL: 'bg-red-500',
}

export default function TaskCard({ task, onClick }) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging
  } = useSortable({ id: task.taskId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const prio = getPriority(task.priority)
  const overdue = isOverdue(task.deadline)
  const dueToday = isDueToday(task.deadline)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'card p-4 cursor-pointer hover:shadow-card-hover transition-all duration-150 group select-none',
        isDragging && 'opacity-40 rotate-1 scale-105 shadow-modal z-50',
      )}
    >
      {/* Priority bar */}
      <div className={cn('absolute left-0 top-3 bottom-3 w-1 rounded-r-full', priorityDot[task.priority] ?? 'bg-surface-300')} />

      <div className="pl-1">
        {/* Tags row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge className={prio.color} dot>{prio.label}</Badge>
          {task.teamName && (
            <Badge className="bg-surface-100 text-surface-500">{task.teamName}</Badge>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-surface-800 leading-snug mb-1.5 group-hover:text-brand-700 transition-colors">
          {truncate(task.title, 70)}
        </p>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-surface-400 leading-relaxed mb-3">
            {truncate(task.description, 80)}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Deadline */}
            {task.deadline && (
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-medium',
                overdue  ? 'text-red-500' :
                dueToday ? 'text-amber-600' :
                           'text-surface-400'
              )}>
                {overdue && <AlertCircle size={10} />}
                <Calendar size={10} />
                {fmtDate(task.deadline)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Comment count */}
            {task.commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-surface-400">
                <MessageSquare size={10} />
                {task.commentCount}
              </span>
            )}
            {/* Attachment count */}
            {task.imageUrl && (
              <span className="flex items-center gap-0.5 text-[10px] text-surface-400">
                <Paperclip size={10} />
              </span>
            )}
            {/* Assignee */}
            {task.assigneeName && (
              <Avatar name={task.assigneeName} size="xs" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
