import React, { useState, useEffect } from 'react'
import { Plus, FolderOpen, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { fmtDate, cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editProj, setEditProj] = useState(null)
  const [form, setForm]         = useState({ name: '', description: '' })
  const [saving, setSaving]     = useState(false)

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
      toast.success('Project deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

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
          <EmptyState icon={FolderOpen} title="No projects yet"
            description={canManage ? 'Create your first project to start organizing work.' : 'No projects have been created yet.'}
            action={canManage && <button onClick={() => openForm()} className="btn-primary text-xs">Create project</button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.projectId} className="card p-5 hover:shadow-card-hover transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <FolderOpen size={20} className="text-brand-600" />
                  </div>
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openForm(p)} className="btn-ghost p-1.5 rounded-lg">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => del(p.projectId)} className="btn-ghost p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-surface-900 mb-1">{p.name}</h3>
                {p.description && <p className="text-xs text-surface-400 leading-relaxed mb-3">{p.description}</p>}
                <div className="flex items-center gap-3 text-[10px] text-surface-400 border-t border-surface-100 pt-3 mt-auto">
                  <span>{p.taskCount ?? 0} tasks</span>
                  <span>Created {fmtDate(p.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              {editProj ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
