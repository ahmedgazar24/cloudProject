import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, LayoutGrid, List, Filter, Search } from 'lucide-react'
import Header from '../components/layout/Header'
import KanbanBoard from '../components/kanban/KanbanBoard'
import TaskForm from '../components/tasks/TaskForm'
import TaskDetail from '../components/tasks/TaskDetail'
import { PageLoader, SkeletonCard } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import { cn, getPriority, getStatus, fmtDate, isOverdue } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function TasksPage() {
  const { user } = useAuth()
  const location = useLocation()
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState('kanban')
  const [search, setSearch]     = useState('')
  const [filterPrio, setFilterPrio]   = useState('')
  const [filterTeam, setFilterTeam]   = useState('')
  const [teams, setTeams]       = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [defaultStatus, setDefaultStatus] = useState('TODO')
  const [activeTask, setActiveTask] = useState(null)

  const canManage = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  const loadTasks = useCallback(() => {
    const params = new URLSearchParams()
    if (filterTeam) params.set('teamId', filterTeam)
    if (filterPrio) params.set('priority', filterPrio)
    return api.get(`/tasks?${params}`).then(r => setTasks(r.data.tasks ?? []))
  }, [filterTeam, filterPrio])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      loadTasks(),
      api.get('/teams').then(r => setTeams(r.data.teams ?? []))
    ]).finally(() => setLoading(false))
  }, [loadTasks])

  // Handle navigation state (open task from dashboard)
  useEffect(() => {
    if (location.state?.openTask && tasks.length > 0) {
      const t = tasks.find(x => x.taskId === location.state.openTask.taskId)
      if (t) setActiveTask(t)
    }
  }, [location.state, tasks])

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: newStatus } : t))
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus })
    } catch {
      toast.error('Failed to update status')
      loadTasks()
    }
  }

  const handleSaved = (saved) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.taskId === saved.taskId)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next
      }
      return [saved, ...prev]
    })
  }

  const handleDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
  }

  const handleAddInColumn = (status) => {
    setDefaultStatus(status)
    setEditTask(null)
    setShowForm(true)
  }

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          className="input pl-8 py-1.5 text-xs w-44"
          placeholder="Search tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Team filter (manager only) */}
      {canManage && teams.length > 0 && (
        <select className="input py-1.5 text-xs w-36"
          value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          <option value="">All teams</option>
          {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
        </select>
      )}

      {/* View toggle */}
      <div className="flex rounded-xl border border-surface-200 overflow-hidden">
        <button onClick={() => setView('kanban')} className={cn('px-2.5 py-1.5 text-xs transition-colors', view === 'kanban' ? 'bg-brand-600 text-white' : 'text-surface-500 hover:bg-surface-50')}>
          <LayoutGrid size={15} />
        </button>
        <button onClick={() => setView('list')} className={cn('px-2.5 py-1.5 text-xs transition-colors', view === 'list' ? 'bg-brand-600 text-white' : 'text-surface-500 hover:bg-surface-50')}>
          <List size={15} />
        </button>
      </div>

      {canManage && (
        <button onClick={() => { setEditTask(null); setDefaultStatus('TODO'); setShowForm(true) }} className="btn-primary text-xs gap-1.5">
          <Plus size={15} /> New task
        </button>
      )}
    </div>
  )

  return (
    <>
      <Header title="Tasks" actions={headerActions} />

      <div className="flex-1 overflow-hidden p-6 animate-fade-in">
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="No tasks found"
            description={canManage ? "Create your first task to get started." : "No tasks have been assigned to you yet."}
            action={canManage && <button onClick={() => setShowForm(true)} className="btn-primary text-xs">Create task</button>}
          />
        ) : view === 'kanban' ? (
          <div className="overflow-x-auto h-full">
            <KanbanBoard
              tasks={filtered}
              onTaskClick={setActiveTask}
              onStatusChange={handleStatusChange}
              onAddTask={handleAddInColumn}
              canAdd={canManage}
            />
          </div>
        ) : (
          <ListView tasks={filtered} onTaskClick={setActiveTask} />
        )}
      </div>

      {/* Task Form */}
      <TaskForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(null) }}
        onSaved={handleSaved}
        defaultStatus={defaultStatus}
        editTask={editTask}
      />

      {/* Task Detail */}
      <TaskDetail
        task={activeTask}
        open={!!activeTask}
        onClose={() => setActiveTask(null)}
        onEdit={t => { setEditTask(t); setActiveTask(null); setShowForm(true) }}
        onDeleted={handleDeleted}
        onStatusChange={(id, s) => {
          handleStatusChange(id, s)
          setActiveTask(prev => prev?.taskId === id ? { ...prev, status: s } : prev)
        }}
      />
    </>
  )
}

function ListView({ tasks, onTaskClick }) {
  return (
    <div className="card overflow-hidden animate-fade-in">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50">
            {['Title', 'Team', 'Assignee', 'Priority', 'Status', 'Deadline'].map(h => (
              <th key={h} className="text-left text-[10px] font-semibold text-surface-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-50">
          {tasks.map(t => {
            const prio   = getPriority(t.priority)
            const status = getStatus(t.status)
            const over   = isOverdue(t.deadline)
            return (
              <tr key={t.taskId} onClick={() => onTaskClick(t)}
                className="hover:bg-surface-50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-surface-800 truncate max-w-[200px]">{t.title}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-surface-500">{t.teamName ?? '—'}</span>
                </td>
                <td className="px-4 py-3">
                  {t.assigneeName
                    ? <div className="flex items-center gap-2"><Avatar name={t.assigneeName} size="xs" /><span className="text-xs text-surface-600">{t.assigneeName}</span></div>
                    : <span className="text-xs text-surface-300">Unassigned</span>}
                </td>
                <td className="px-4 py-3"><Badge className={prio.color} dot>{prio.label}</Badge></td>
                <td className="px-4 py-3"><Badge className={status.color}>{status.label}</Badge></td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs', over ? 'text-red-500 font-semibold' : 'text-surface-500')}>
                    {t.deadline ? fmtDate(t.deadline) : '—'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
