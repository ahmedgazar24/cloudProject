import React, { useState, useEffect } from 'react'
import { Plus, FolderOpen, Trash2, Edit2, ArrowLeft, CheckSquare, Clock, AlertCircle } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader, Spinner } from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import TaskDetail from '../components/tasks/TaskDetail'
import TaskForm from '../components/tasks/TaskForm'
import { useAuth } from '../context/AuthContext'
import { fmtDate, cn, getPriority, getStatus, isOverdue } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

// ─── Project task list ────────────────────────────────────────────────────────
function ProjectDetail({ project, canManage, onBack, onProjectUpdated }) {
  const [tasks, setTasks]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTask, setActiveTask] = useState(null)
  const [showForm, setShowForm]   = useState(false)
  const [editTask, setEditTask]   = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get(`/tasks?projectId=${project.projectId}`)
      .then(r => setTasks(r.data.tasks ?? []))
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false))
  }, [project.projectId])

  const handleSaved = (saved) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.taskId === saved.taskId)
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
      return [saved, ...prev]
    })
    // Update task count on the project card list
    onProjectUpdated({ ...project, taskCount: tasks.length + 1 })
  }

  const handleDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t.taskId !== taskId))
    onProjectUpdated({ ...project, taskCount: Math.max(0, (project.taskCount ?? 0) - 1) })
  }

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.taskId === taskId ? { ...t, status: newStatus } : t))
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus })
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Task counts per status for the mini progress bar
  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'DONE').length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const overdue    = tasks.filter(t => isOverdue(t.deadline)).length
  const progress   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <>
      {/* Sub-header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="btn-ghost p-1.5 rounded-lg gap-1.5 text-xs">
            <ArrowLeft size={15} /> Projects
          </button>
          <span className="text-surface-300">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center">
              <FolderOpen size={13} className="text-brand-600" />
            </div>
            <span className="text-sm font-semibold text-surface-800">{project.name}</span>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditTask(null); setShowForm(true) }}
            className="btn-primary text-xs gap-1.5"
          >
            <Plus size={14} /> Add task
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">

        {/* Project info + progress */}
        <div className="card p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-base font-bold text-surface-900">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-surface-500 mt-0.5">{project.description}</p>
              )}
            </div>
            <span className="text-xs text-surface-400 flex-shrink-0">Created {fmtDate(project.createdAt)}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-5 text-xs mb-4">
            <span className="flex items-center gap-1.5 text-surface-500">
              <CheckSquare size={13} className="text-emerald-500" />
              {done} / {total} done
            </span>
            <span className="flex items-center gap-1.5 text-surface-500">
              <Clock size={13} className="text-blue-500" />
              {inProgress} in progress
            </span>
            {overdue > 0 && (
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <AlertCircle size={13} />
                {overdue} overdue
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-surface-400">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <PageLoader />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks in this project"
            description={canManage ? 'Add tasks to start tracking work.' : 'No tasks have been added to this project yet.'}
            action={canManage && (
              <button onClick={() => setShowForm(true)} className="btn-primary text-xs">Add task</button>
            )}
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50">
                  {['Title', 'Assignee', 'Priority', 'Status', 'Deadline'].map(h => (
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
                    <tr
                      key={t.taskId}
                      onClick={() => setActiveTask(t)}
                      className="hover:bg-surface-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-800 truncate max-w-[220px]">{t.title}</p>
                        {t.teamName && <p className="text-[10px] text-surface-400 mt-0.5">{t.teamName}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {t.assigneeName
                          ? <div className="flex items-center gap-2">
                              <Avatar name={t.assigneeName} size="xs" />
                              <span className="text-xs text-surface-600">{t.assigneeName}</span>
                            </div>
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
        )}
      </div>

      {/* Task detail modal */}
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

      {/* Task form — pre-fills projectId */}
      <TaskForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditTask(null) }}
        onSaved={handleSaved}
        projectId={project.projectId}
        editTask={editTask}
        defaultStatus="TODO"
      />
    </>
  )
}

// ─── Projects list ────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editProj, setEditProj]   = useState(null)
  const [form, setForm]           = useState({ name: '', description: '' })
  const [saving, setSaving]       = useState(false)
  const [openProject, setOpenProject] = useState(null) // project being viewed

  const canManage = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  const load = () =>
    api.get('/projects').then(r => setProjects(r.data.projects ?? []))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openForm = (proj) => {
    setEditProj(proj ?? null)
    setForm(proj ? { name: proj.name, description: proj.description ?? '' } : { name: '', description: '' })
    setShowForm(true)
  }

  const save = async e => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editProj) {
        const r = await api.patch(`/projects/${editProj.projectId}`, form)
        setProjects(prev => prev.map(p => p.projectId === editProj.projectId ? r.data.project : p))
        // If currently viewing this project, update it
        if (openProject?.projectId === editProj.projectId) setOpenProject(r.data.project)
        toast.success('Project updated')
      } else {
        const r = await api.post('/projects', form)
        setProjects(prev => [r.data.project, ...prev])
        toast.success('Project created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id) => {
    if (!window.confirm('Delete this project?')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(prev => prev.filter(p => p.projectId !== id))
      if (openProject?.projectId === id) setOpenProject(null)
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  // Called by ProjectDetail when a task is added/deleted to keep taskCount in sync
  const handleProjectUpdated = (updated) => {
    setProjects(prev => prev.map(p => p.projectId === updated.projectId ? updated : p))
    setOpenProject(updated)
  }

  // ── If a project is open, show its detail view ──
  if (openProject) {
    return (
      <>
        <Header
          title="Projects"
          actions={canManage && (
            <div className="flex gap-2">
              <button onClick={() => openForm(openProject)} className="btn-secondary text-xs gap-1.5">
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={() => del(openProject.projectId)} className="btn-danger text-xs gap-1.5">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        />
        <ProjectDetail
          project={openProject}
          canManage={canManage}
          onBack={() => setOpenProject(null)}
          onProjectUpdated={handleProjectUpdated}
        />

        {/* Project edit form */}
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Edit Project" size="sm">
          <form onSubmit={save} className="p-6 space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" placeholder="Project name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} placeholder="What's this project about?"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving && <Spinner size="sm" />} Save changes
              </button>
            </div>
          </form>
        </Modal>
      </>
    )
  }

  // ── Projects grid ──
  const headerActions = canManage && (
    <button onClick={() => openForm()} className="btn-primary text-xs gap-1.5">
      <Plus size={15} /> New project
    </button>
  )

  return (
    <>
      <Header title="Projects" actions={headerActions} />

      <div className="flex-1 overflow-y-auto p-6 animate-fade-in">
        {loading ? <PageLoader /> : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description={canManage ? 'Create your first project to start organising work.' : 'No projects have been created yet.'}
            action={canManage && <button onClick={() => openForm()} className="btn-primary text-xs">Create project</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div
                key={p.projectId}
                onClick={() => setOpenProject(p)}
                className="card p-5 hover:shadow-card-hover transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <FolderOpen size={20} className="text-brand-600" />
                  </div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); openForm(p) }}
                        className="btn-ghost p-1.5 rounded-lg"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); del(p.projectId) }}
                        className="btn-ghost p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-sm font-semibold text-surface-900 mb-1">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-surface-400 leading-relaxed mb-3 line-clamp-2">{p.description}</p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-surface-400 border-t border-surface-100 pt-3">
                  <span className="flex items-center gap-1">
                    <CheckSquare size={10} />
                    {p.taskCount ?? 0} task{p.taskCount !== 1 ? 's' : ''}
                  </span>
                  <span>Created {fmtDate(p.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create project form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editProj ? 'Edit Project' : 'New Project'} size="sm">
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" placeholder="Project name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="What's this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" />}
              {editProj ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
