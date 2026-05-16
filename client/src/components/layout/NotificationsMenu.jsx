import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, AlertTriangle, Clock, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import { cn, fmtRelative, isOverdue, isDueToday } from '../../lib/utils'

const READ_KEY = 'mj_notifications_read'

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
}

function buildNotifications(tasks, userId) {
  const mine = tasks.filter(t => t.assigneeId === userId && t.status !== 'DONE')
  const items = mine.map(task => {
    if (isOverdue(task.deadline)) {
      return { id: task.taskId, task, type: 'overdue', icon: AlertTriangle, message: `Overdue: ${task.title}`, sort: 0 }
    }
    if (isDueToday(task.deadline)) {
      return { id: task.taskId, task, type: 'due_today', icon: Clock, message: `Due today: ${task.title}`, sort: 1 }
    }
    return { id: task.taskId, task, type: 'assigned', icon: CheckSquare, message: task.title, sort: 2 }
  })
  return items.sort((a, b) => a.sort - b.sort || new Date(b.task.updatedAt || b.task.createdAt) - new Date(a.task.updatedAt || a.task.createdAt))
}

export default function NotificationsMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [readIds, setReadIds] = useState(getReadIds)
  const ref = useRef(null)

  const load = useCallback(async () => {
    if (!user?.userId) return
    setLoading(true)
    try {
      const { data } = await api.get('/tasks')
      setItems(buildNotifications(data.tasks ?? [], user.userId))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user?.userId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const onOutside = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onEscape = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const unread = items.filter(n => !readIds.has(n.id)).length

  const markAllRead = () => {
    const next = new Set(readIds)
    items.forEach(n => next.add(n.id))
    setReadIds(next)
    saveReadIds(next)
  }

  const openTask = (task) => {
    const next = new Set(readIds)
    next.add(task.taskId)
    setReadIds(next)
    saveReadIds(next)
    setOpen(false)
    navigate('/tasks', { state: { openTask: { taskId: task.taskId } } })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="btn-ghost rounded-xl p-2 relative"
      >
        <Bell size={17} className="text-surface-500" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-surface-200 shadow-modal z-50 animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Notifications</h3>
            {items.length > 0 && unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-surface-400 text-center py-8">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-8">No notifications</p>
            ) : (
              <ul className="divide-y divide-surface-50">
                {items.map(({ id, task, type, icon: Icon, message }) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => openTask(task)}
                      className={cn(
                        'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors',
                        !readIds.has(id) && 'bg-brand-50/40'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                        type === 'overdue' && 'bg-red-50 text-red-600',
                        type === 'due_today' && 'bg-amber-50 text-amber-600',
                        type === 'assigned' && 'bg-brand-50 text-brand-600',
                      )}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-medium text-surface-800 truncate', !readIds.has(id) && 'font-semibold')}>
                          {message}
                        </p>
                        <p className="text-[10px] text-surface-400 mt-0.5">
                          {task.teamName ?? 'Your team'} · {fmtRelative(task.updatedAt || task.createdAt)}
                        </p>
                      </div>
                      {!readIds.has(id) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
