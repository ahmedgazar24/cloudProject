import React, { useState, useEffect } from 'react'
import { Plus, Users, UserPlus, Trash2, Edit2 } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTeam, setEditTeam] = useState(null)
  const [form, setForm]         = useState({ name: '' })
  const [saving, setSaving]     = useState(false)
  const [members, setMembers]   = useState({}) // teamId -> users[]
  const [expanded, setExpanded] = useState(null)

  const load = () =>
    api.get('/teams').then(r => setTeams(r.data.teams ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const toggleExpand = async (teamId) => {
    if (expanded === teamId) { setExpanded(null); return }
    setExpanded(teamId)
    if (!members[teamId]) {
      const r = await api.get(`/users?teamId=${teamId}`)
      setMembers(m => ({ ...m, [teamId]: r.data.users ?? [] }))
    }
  }

  const openForm = (team) => {
    setEditTeam(team ?? null)
    setForm(team ? { name: team.name } : { name: '' })
    setShowForm(true)
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTeam) {
        const r = await api.patch(`/teams/${editTeam.teamId}`, form)
        setTeams(prev => prev.map(t => t.teamId === editTeam.teamId ? r.data.team : t))
        toast.success('Team updated')
      } else {
        const r = await api.post('/teams', form)
        setTeams(prev => [r.data.team, ...prev])
        toast.success('Team created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  const del = async id => {
    if (!window.confirm('Delete this team? All members will be unassigned.')) return
    try {
      await api.delete(`/teams/${id}`)
      setTeams(prev => prev.filter(t => t.teamId !== id))
      toast.success('Team deleted')
    } catch { toast.error('Failed to delete') }
  }

  const headerActions = (
    <button onClick={() => openForm()} className="btn-primary text-xs gap-1.5">
      <Plus size={15} /> New team
    </button>
  )

  return (
    <>
      <Header title="Teams" actions={headerActions} />
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {loading ? <PageLoader /> : teams.length === 0 ? (
          <EmptyState icon={Users} title="No teams yet"
            description="Create teams to organize your employees."
            action={<button onClick={() => openForm()} className="btn-primary text-xs">Create team</button>} />
        ) : (
          <div className="space-y-3 max-w-2xl">
            {teams.map(t => (
              <div key={t.teamId} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => toggleExpand(t.teamId)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                      <Users size={18} className="text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-900">{t.name}</p>
                      <p className="text-[10px] text-surface-400">{t.memberCount ?? 0} members</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); openForm(t) }} className="btn-ghost p-1.5 rounded-lg">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); del(t.teamId) }} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {expanded === t.teamId && (
                  <div className="border-t border-surface-100 px-5 py-3 bg-surface-50 animate-fade-in">
                    {!members[t.teamId] ? (
                      <p className="text-xs text-surface-400 py-2">Loading members…</p>
                    ) : members[t.teamId].length === 0 ? (
                      <p className="text-xs text-surface-400 py-2">No members yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {members[t.teamId].map(u => (
                          <div key={u.userId} className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-surface-200">
                            <Avatar name={u.name} size="xs" />
                            <span className="text-xs font-medium text-surface-700">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editTeam ? 'Edit Team' : 'New Team'} size="sm">
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="label">Team name *</label>
            <input className="input" placeholder="e.g. Frontend, Backend, QA…"
              value={form.name} onChange={e => setForm({ name: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {editTeam ? 'Save' : 'Create team'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
