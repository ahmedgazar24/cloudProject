import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, Trash2, Edit2, UserCog, ChevronDown, ChevronUp, UserMinus, UserPlus } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader, Spinner } from '../components/ui/Spinner'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'

// ─── Edit Member Modal ────────────────────────────────────────────────────────
function EditMemberModal({ member, teams, open, onClose, onSaved }) {
  const [teamId, setTeamId] = useState('')
  const [role,   setRole]   = useState('EMPLOYEE')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setTeamId(member.teamId ?? '')
      setRole(member.role ?? 'EMPLOYEE')
    }
  }, [member])

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await api.patch(`/users/${member.userId}`, { teamId, role })
      toast.success(`${member.name} updated`)
      onSaved(data.user)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to update member')
    } finally {
      setSaving(false)
    }
  }

  if (!member) return null
  return (
    <Modal open={open} onClose={onClose} title="Edit Member" size="sm">
      <form onSubmit={save} className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
          <Avatar name={member.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-surface-800">{member.name}</p>
            <p className="text-xs text-surface-400">{member.email}</p>
          </div>
        </div>

        <div>
          <label className="label">Assign to Team</label>
          <select className="input" value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">— No team —</option>
            {teams.map(t => (
              <option key={t.teamId} value={t.teamId}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value)}>
            <option value="EMPLOYEE">Employee</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner size="sm" />}
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Manage Members Modal ─────────────────────────────────────────────────────
function ManageMembersModal({ team, allUsers, teams, open, onClose, onUsersChanged }) {
  const [editTarget, setEditTarget] = useState(null)
  const [showEdit,   setShowEdit]   = useState(false)
  const [removing,   setRemoving]   = useState(null)

  const members = allUsers.filter(u => u.teamId === team?.teamId)

  const handleRemove = async (u) => {
    if (!window.confirm(`Remove ${u.name} from ${team.name}?`)) return
    setRemoving(u.userId)
    try {
      const { data } = await api.patch(`/users/${u.userId}`, { teamId: '' })
      onUsersChanged(data.user)
      toast.success(`${u.name} removed from ${team.name}`)
    } catch {
      toast.error('Failed to remove member')
    } finally {
      setRemoving(null)
    }
  }

  const handleMemberSaved = (updated) => {
    onUsersChanged(updated)
    setShowEdit(false)
    setEditTarget(null)
  }

  if (!team) return null
  return (
    <>
      <Modal open={open} onClose={onClose} title={`Members — ${team.name}`} size="md">
        <div className="p-6">
          {members.length === 0 ? (
            <div className="text-center py-10">
              <Users size={32} className="text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500 font-medium">No members in this team</p>
              <p className="text-xs text-surface-400 mt-1 max-w-xs mx-auto">
                Use <strong>All Employees</strong> to assign existing users, or employees can pick this team when registering.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(u => (
                <div key={u.userId}
                  className="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:border-surface-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-surface-800">{u.name}</p>
                      <p className="text-xs text-surface-400">{u.email}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 bg-surface-100 rounded-lg px-2 py-0.5">
                      {u.role}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditTarget(u); setShowEdit(true) }}
                      className="btn-ghost p-1.5 rounded-lg"
                      title="Change team / role"
                    >
                      <UserCog size={14} />
                    </button>
                    <button
                      onClick={() => handleRemove(u)}
                      disabled={removing === u.userId}
                      className="btn-ghost p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                      title="Remove from team"
                    >
                      {removing === u.userId ? <Spinner size="sm" /> : <UserMinus size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-surface-400 mt-5 pt-4 border-t border-surface-100">
            Click <UserCog size={11} className="inline" /> to move an employee to a different team or change their role.
          </p>
        </div>
      </Modal>

      <EditMemberModal
        member={editTarget}
        teams={teams}
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTarget(null) }}
        onSaved={handleMemberSaved}
      />
    </>
  )
}

// ─── All Employees Modal ──────────────────────────────────────────────────────
function AllEmployeesModal({ allUsers, teams, open, onClose, onUsersChanged }) {
  const [editTarget, setEditTarget] = useState(null)
  const [showEdit,   setShowEdit]   = useState(false)
  const [search,     setSearch]     = useState('')

  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const getTeamName = (teamId) => teams.find(t => t.teamId === teamId)?.name

  return (
    <>
      <Modal open={open} onClose={onClose} title="All Employees" size="lg">
        <div className="p-6">
          <input
            className="input mb-4"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No employees found.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filtered.map(u => (
                <div key={u.userId}
                  className="flex items-center justify-between p-3 rounded-xl border border-surface-100 hover:border-surface-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={u.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{u.name}</p>
                      <p className="text-xs text-surface-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      {u.teamId
                        ? <p className="text-xs font-medium text-surface-600">{getTeamName(u.teamId) ?? u.teamId}</p>
                        : <p className="text-xs text-surface-300 italic">No team</p>
                      }
                      <p className="text-[10px] text-surface-400 capitalize">{u.role?.toLowerCase()}</p>
                    </div>
                    <button
                      onClick={() => { setEditTarget(u); setShowEdit(true) }}
                      className="btn-ghost p-1.5 rounded-lg"
                      title="Edit team / role"
                    >
                      <UserCog size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <EditMemberModal
        member={editTarget}
        teams={teams}
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditTarget(null) }}
        onSaved={(updated) => { onUsersChanged(updated); setShowEdit(false); setEditTarget(null) }}
      />
    </>
  )
}

// ─── Main TeamsPage ───────────────────────────────────────────────────────────
export default function TeamsPage() {
  const navigate = useNavigate()
  const [teams,    setTeams]    = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showTeamForm,     setShowTeamForm]     = useState(false)
  const [editTeam,         setEditTeam]         = useState(null)
  const [teamForm,         setTeamForm]         = useState({ name: '' })
  const [saving,           setSaving]           = useState(false)
  const [expanded,         setExpanded]         = useState(null)
  const [managingTeam,     setManagingTeam]     = useState(null)
  const [showManage,       setShowManage]       = useState(false)
  const [showAllEmployees, setShowAllEmployees] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/teams'), api.get('/users')])
      .then(([tr, ur]) => {
        setTeams(tr.data.teams ?? [])
        setAllUsers(ur.data.users ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const teamsWithCount = teams.map(t => ({
    ...t,
    memberCount: allUsers.filter(u => u.teamId === t.teamId).length,
  }))

  const handleUsersChanged = (updatedUser) => {
    setAllUsers(prev => prev.map(u => u.userId === updatedUser.userId ? updatedUser : u))
  }

  const openTeamForm = (team) => {
    setEditTeam(team ?? null)
    setTeamForm(team ? { name: team.name } : { name: '' })
    setShowTeamForm(true)
  }

  const saveTeam = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTeam) {
        const r = await api.patch(`/teams/${editTeam.teamId}`, teamForm)
        setTeams(prev => prev.map(t => t.teamId === editTeam.teamId ? r.data.team : t))
        toast.success('Team updated')
      } else {
        const r = await api.post('/teams', teamForm)
        setTeams(prev => [r.data.team, ...prev])
        toast.success('Team created')
      }
      setShowTeamForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  const deleteTeam = async id => {
    if (!window.confirm('Delete this team? Members will be unassigned.')) return
    try {
      await api.delete(`/teams/${id}`)
      setTeams(prev => prev.filter(t => t.teamId !== id))
      toast.success('Team deleted')
    } catch { toast.error('Failed to delete') }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button onClick={() => setShowAllEmployees(true)} className="btn-secondary text-xs gap-1.5">
        <Users size={14} /> All Employees
      </button>
      <button onClick={() => openTeamForm()} className="btn-primary text-xs gap-1.5">
        <Plus size={15} /> New team
      </button>
    </div>
  )

  return (
    <>
      <Header title="Teams" actions={headerActions} />
      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {loading ? <PageLoader /> : teamsWithCount.length === 0 ? (
          <EmptyState icon={Users} title="No teams yet"
            description="Create teams to organize your employees."
            action={<button onClick={() => openTeamForm()} className="btn-primary text-xs">Create team</button>}
          />
        ) : (
          <div className="space-y-3 max-w-2xl">
            {teamsWithCount.map(t => {
              const teamMembers = allUsers.filter(u => u.teamId === t.teamId)
              return (
                <div key={t.teamId} className="card overflow-hidden">
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-50 transition-colors"
                    onClick={() => setExpanded(expanded === t.teamId ? null : t.teamId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                        <Users size={18} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-900">{t.name}</p>
                        <p className="text-[10px] text-surface-400">{t.memberCount} member{t.memberCount !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/register?teamId=${t.teamId}`) }}
                        className="btn-ghost p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Add new member"
                      >
                        <UserPlus size={15} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setManagingTeam(t); setShowManage(true) }}
                        className="btn-ghost p-1.5 rounded-lg text-brand-600 hover:bg-brand-50"
                        title="Manage members"
                      >
                        <UserCog size={15} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); openTeamForm(t) }} className="btn-ghost p-1.5 rounded-lg" title="Rename team">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteTeam(t.teamId) }} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:bg-red-50" title="Delete team">
                        <Trash2 size={13} />
                      </button>
                      {expanded === t.teamId ? <ChevronUp size={14} className="text-surface-400 ml-1" /> : <ChevronDown size={14} className="text-surface-400 ml-1" />}
                    </div>
                  </div>

                  {expanded === t.teamId && (
                    <div className="border-t border-surface-100 px-5 py-3 bg-surface-50 animate-fade-in">
                      {teamMembers.length === 0 ? (
                        <p className="text-xs text-surface-400 py-1">
                          No members yet — click <UserCog size={11} className="inline mx-0.5" /> to manage.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {teamMembers.map(u => (
                            <div key={u.userId}
                              className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-surface-200 cursor-pointer hover:border-brand-300 transition-colors"
                              onClick={e => { e.stopPropagation(); setManagingTeam(t); setShowManage(true) }}
                            >
                              <Avatar name={u.name} size="xs" />
                              <span className="text-xs font-medium text-surface-700">{u.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Team name form */}
      <Modal open={showTeamForm} onClose={() => setShowTeamForm(false)} title={editTeam ? 'Edit Team' : 'New Team'} size="sm">
        <form onSubmit={saveTeam} className="p-6 space-y-4">
          <div>
            <label className="label">Team name *</label>
            <input className="input" placeholder="e.g. Frontend, Backend, QA…"
              value={teamForm.name} onChange={e => setTeamForm({ name: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <button type="button" onClick={() => setShowTeamForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" />}
              {editTeam ? 'Save' : 'Create team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage team members */}
      <ManageMembersModal
        team={managingTeam}
        allUsers={allUsers}
        teams={teamsWithCount}
        open={showManage}
        onClose={() => { setShowManage(false); setManagingTeam(null) }}
        onUsersChanged={handleUsersChanged}
      />

      {/* All employees browser */}
      <AllEmployeesModal
        allUsers={allUsers}
        teams={teamsWithCount}
        open={showAllEmployees}
        onClose={() => setShowAllEmployees(false)}
        onUsersChanged={handleUsersChanged}
      />
    </>
  )
}
