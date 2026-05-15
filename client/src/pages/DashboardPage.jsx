import React, { useState, useEffect } from 'react'
import { CheckSquare, Clock, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import { PageLoader } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { cn, fmtDate, isOverdue, getPriority, getStatus } from '../lib/utils'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import api from '../lib/api'

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon size={20} className="text-current" />
        </div>
      </div>
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-surface-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/tasks').then(r => {
      setTasks(r.data.tasks ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <><Header title="Dashboard" /><PageLoader /></>

  const total      = tasks.length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const done       = tasks.filter(t => t.status === 'DONE').length
  const overdue    = tasks.filter(t => isOverdue(t.deadline)).length
  const myTasks    = tasks.filter(t => t.assigneeId === user?.userId)
  const recent     = tasks.slice(0, 5)

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">

        {/* Welcome */}
        <div className="card p-6 bg-gradient-to-r from-brand-600 to-brand-700 border-0 text-white">
          <p className="text-brand-200 text-sm mb-1">Good {greeting()},</p>
          <h2 className="text-2xl font-bold">{user?.name}</h2>
          <p className="text-brand-200 text-sm mt-1">
            {user?.role === 'MANAGER'
              ? `You have ${total} tasks across all teams to oversee.`
              : `You have ${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} assigned to you.`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckSquare}   label="Total tasks"    value={total}      color="bg-brand-50 text-brand-600"   />
          <StatCard icon={Clock}         label="In progress"    value={inProgress} color="bg-blue-50 text-blue-600"     />
          <StatCard icon={TrendingUp}    label="Completed"      value={done}       color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={AlertTriangle} label="Overdue"        value={overdue}    color="bg-red-50 text-red-600"       />
        </div>

        {/* Recent tasks */}
        <div className="card">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800">Recent Tasks</h3>
            <button onClick={() => navigate('/tasks')} className="btn-ghost text-xs gap-1">
              View all <ArrowRight size={13} />
            </button>
          </div>
          <div className="divide-y divide-surface-100">
            {recent.length === 0 && (
              <p className="text-xs text-surface-400 text-center py-10">No tasks yet.</p>
            )}
            {recent.map(t => {
              const prio   = getPriority(t.priority)
              const status = getStatus(t.status)
              return (
                <div key={t.taskId} onClick={() => navigate('/tasks', { state: { openTask: t } })}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{t.title}</p>
                    <p className="text-xs text-surface-400">{t.teamName ?? t.teamId}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={prio.color} dot>{prio.label}</Badge>
                    <Badge className={status.color}>{status.label}</Badge>
                    {t.assigneeName && <Avatar name={t.assigneeName} size="xs" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
