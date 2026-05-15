import React, { useState, useEffect } from 'react'
import Header from '../components/layout/Header'
import { PageLoader } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { STATUSES, PRIORITIES } from '../lib/utils'
import api from '../lib/api'

// Simple bar chart using divs
function BarChart({ data, label, color = 'bg-brand-500' }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <p className="text-xs font-semibold text-surface-600 mb-3">{label}</p>
      <div className="flex items-end gap-2 h-24">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-surface-500 font-medium">{d.value}</span>
            <div
              className={`${color} rounded-t-md w-full transition-all duration-500`}
              style={{ height: `${(d.value / max) * 80}px`, minHeight: d.value > 0 ? '4px' : '0' }}
            />
            <span className="text-[10px] text-surface-400 truncate w-full text-center">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PieChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80">
        {data.map((d, i) => {
          if (d.value === 0 || total === 0) return null
          const pct = d.value / total
          const r   = 32
          const cx  = 40, cy = 40
          const startAngle = offset * 2 * Math.PI - Math.PI / 2
          const endAngle   = (offset + pct) * 2 * Math.PI - Math.PI / 2
          const x1 = cx + r * Math.cos(startAngle)
          const y1 = cy + r * Math.sin(startAngle)
          const x2 = cx + r * Math.cos(endAngle)
          const y2 = cy + r * Math.sin(endAngle)
          const large = pct > 0.5 ? 1 : 0
          offset += pct
          return (
            <path key={i}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={d.fill}
              opacity="0.85"
            />
          )
        })}
        <circle cx="40" cy="40" r="20" fill="white" />
        <text x="40" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e2235">{total}</text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
              <span className="text-xs text-surface-600">{d.name}</span>
            </div>
            <span className="text-xs font-semibold text-surface-700">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const FILL_STATUS = {
  TODO:        '#c8cfe0',
  IN_PROGRESS: '#93c5fd',
  IN_REVIEW:   '#fcd34d',
  DONE:        '#6ee7b7',
}

const FILL_PRIO = {
  LOW:      '#cbd5e1',
  MEDIUM:   '#fde68a',
  HIGH:     '#fb923c',
  CRITICAL: '#f87171',
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  if (user?.role !== 'MANAGER' && user?.role !== 'ADMIN') return <Navigate to="/dashboard" />

  useEffect(() => {
    api.get('/tasks').then(r => setTasks(r.data.tasks ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <><Header title="Analytics" /><PageLoader /></>

  const byStatus = STATUSES.map(s => ({
    name: s.label, value: tasks.filter(t => t.status === s.id).length,
    fill: FILL_STATUS[s.id]
  }))

  const byPriority = PRIORITIES.map(p => ({
    name: p.label, value: tasks.filter(t => t.priority === p.id).length,
    fill: FILL_PRIO[p.id]
  }))

  // Group by team
  const teamMap = {}
  for (const t of tasks) {
    const tn = t.teamName ?? t.teamId ?? 'Unknown'
    teamMap[tn] = (teamMap[tn] ?? 0) + 1
  }
  const byTeam = Object.entries(teamMap).map(([name, value]) => ({ name, value }))

  // Group by date (last 7 days)
  const dayMap = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dayMap[d.toLocaleDateString('en', { weekday: 'short' })] = 0
  }
  for (const t of tasks) {
    if (t.createdAt) {
      const d = new Date(t.createdAt)
      const k = d.toLocaleDateString('en', { weekday: 'short' })
      if (k in dayMap) dayMap[k]++
    }
  }
  const byDay = Object.entries(dayMap).map(([name, value]) => ({ name, value }))

  return (
    <>
      <Header title="Analytics" />
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">

          <div className="card p-5">
            <BarChart data={byDay} label="Tasks created (last 7 days)" color="bg-brand-500" />
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-surface-600 mb-3">Tasks by status</p>
            <PieChart data={byStatus} />
          </div>

          <div className="card p-5">
            <BarChart data={byTeam.slice(0, 8)} label="Tasks per team" color="bg-violet-500" />
          </div>

          <div className="card p-5">
            <p className="text-xs font-semibold text-surface-600 mb-3">Tasks by priority</p>
            <PieChart data={byPriority} />
          </div>

          {/* Summary table */}
          <div className="card p-5 md:col-span-2">
            <p className="text-xs font-semibold text-surface-600 mb-3">Status summary</p>
            <div className="grid grid-cols-4 gap-3">
              {byStatus.map(s => (
                <div key={s.name} className="text-center p-3 rounded-xl" style={{ background: s.fill + '30' }}>
                  <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{s.name}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
