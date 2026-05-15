import { clsx } from 'clsx'
import { format, formatDistanceToNow, isPast, isToday } from 'date-fns'

export function cn(...args) {
  return clsx(args)
}

export const STATUSES = [
  { id: 'TODO',       label: 'To Do',       color: 'status-todo' },
  { id: 'IN_PROGRESS',label: 'In Progress', color: 'status-inprogress' },
  { id: 'IN_REVIEW',  label: 'In Review',   color: 'status-inreview' },
  { id: 'DONE',       label: 'Done',        color: 'status-done' },
]

export const PRIORITIES = [
  { id: 'LOW',      label: 'Low',      color: 'priority-low' },
  { id: 'MEDIUM',   label: 'Medium',   color: 'priority-medium' },
  { id: 'HIGH',     label: 'High',     color: 'priority-high' },
  { id: 'CRITICAL', label: 'Critical', color: 'priority-critical' },
]

export function getStatus(id) {
  return STATUSES.find(s => s.id === id) ?? STATUSES[0]
}

export function getPriority(id) {
  return PRIORITIES.find(p => p.id === id) ?? PRIORITIES[0]
}

export function fmtDate(d) {
  if (!d) return '—'
  return format(new Date(d), 'MMM d, yyyy')
}

export function fmtRelative(d) {
  if (!d) return '—'
  return formatDistanceToNow(new Date(d), { addSuffix: true })
}

export function isOverdue(deadline) {
  if (!deadline) return false
  const d = new Date(deadline)
  return !isToday(d) && isPast(d)
}

export function isDueToday(deadline) {
  if (!deadline) return false
  return isToday(new Date(deadline))
}

export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function avatarColor(name = '') {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-indigo-100 text-indigo-700',
  ]
  let hash = 0
  for (const c of name) hash = (hash << 5) - hash + c.charCodeAt(0)
  return colors[Math.abs(hash) % colors.length]
}

export function truncate(str, n = 80) {
  return str?.length > n ? str.slice(0, n) + '…' : str
}
