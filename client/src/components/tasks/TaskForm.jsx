import React, { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Select from '../ui/Select'
import { Spinner } from '../ui/Spinner'
import { PRIORITIES, STATUSES } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const PRIO_OPTS   = PRIORITIES.map(p => ({ value: p.id, label: p.label }))
const STATUS_OPTS = STATUSES.map(s => ({ value: s.id, label: s.label }))

export default function TaskForm({ open, onClose, onSaved, projectId, defaultStatus, editTask }) {
  const isEdit = !!editTask

  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', status: defaultStatus ?? 'TODO',
    deadline: '', assigneeId: '', teamId: '', projectId: projectId ?? ''
  })
  const [teams, setTeams]       = useState([])
  const [employees, setEmployees] = useState([])
  const [projects, setProjects] = useState([])
  const [image, setImage]       = useState(null)
  const [preview, setPreview]   = useState(null)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!open) return
    api.get('/teams').then(r => setTeams(r.data.teams ?? []))
    api.get('/projects').then(r => setProjects(r.data.projects ?? []))
  }, [open])

  useEffect(() => {
    if (form.teamId) {
      api.get(`/users?teamId=${form.teamId}`).then(r => setEmployees(r.data.users ?? []))
    } else {
      setEmployees([])
    }
  }, [form.teamId])

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      setForm({
        title:       editTask.title ?? '',
        description: editTask.description ?? '',
        priority:    editTask.priority ?? 'MEDIUM',
        status:      editTask.status ?? 'TODO',
        deadline:    editTask.deadline ? editTask.deadline.split('T')[0] : '',
        assigneeId:  editTask.assigneeId ?? '',
        teamId:      editTask.teamId ?? '',
        projectId:   editTask.projectId ?? projectId ?? '',
      })
      if (editTask.imageUrl) setPreview(editTask.imageUrl)
    } else {
      setForm(f => ({ ...f, status: defaultStatus ?? 'TODO', projectId: projectId ?? '' }))
      setPreview(null)
      setImage(null)
    }
  }, [open, editTask])

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleFile = e => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size 5MB'); return }
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      if (image) fd.append('image', image)

      let saved
      if (isEdit) {
        const r = await api.patch(`/tasks/${editTask.taskId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        saved = r.data.task
        toast.success('Task updated')
      } else {
        const r = await api.post('/tasks', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        saved = r.data.task
        toast.success('Task created')
      }
      onSaved(saved)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const teamOpts     = [{ value: '', label: 'Select team…' }, ...teams.map(t => ({ value: t.teamId, label: t.name }))]
  const assigneeOpts = [{ value: '', label: 'Select assignee…' }, ...employees.map(u => ({ value: u.userId, label: u.name }))]
  const projectOpts  = [{ value: '', label: 'No project' }, ...projects.map(p => ({ value: p.projectId, label: p.name }))]

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'Create Task'} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Title */}
        <div>
          <label className="label">Title *</label>
          <input className="input" placeholder="Task title…" value={form.title} onChange={set('title')} required />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="What needs to be done?"
            value={form.description}
            onChange={set('description')}
          />
        </div>

        {/* Row: Priority + Status */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" options={PRIO_OPTS} value={form.priority} onChange={set('priority')} />
          <Select label="Status"   options={STATUS_OPTS} value={form.status}   onChange={set('status')} />
        </div>

        {/* Row: Team + Assignee */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Team" options={teamOpts} value={form.teamId} onChange={set('teamId')} />
          <Select label="Assignee" options={assigneeOpts} value={form.assigneeId} onChange={set('assigneeId')} disabled={!form.teamId} />
        </div>

        {/* Row: Deadline + Project */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Deadline</label>
            <input type="date" className="input" value={form.deadline} onChange={set('deadline')} />
          </div>
          <Select label="Project" options={projectOpts} value={form.projectId} onChange={set('projectId')} />
        </div>

        {/* Image upload */}
        <div>
          <label className="label">Attachment</label>
          <label className="flex items-center gap-3 cursor-pointer border border-dashed border-surface-300 rounded-xl p-3 hover:border-brand-400 transition-colors group">
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {preview ? (
              <div className="flex items-center gap-3 w-full">
                <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-surface-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-surface-700 truncate">{image?.name ?? 'Current image'}</p>
                  <p className="text-[10px] text-surface-400">Click to replace</p>
                </div>
                <button type="button" onClick={e => { e.preventDefault(); setImage(null); setPreview(null) }}
                  className="p-1 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-surface-400 group-hover:text-brand-600">
                <Upload size={18} />
                <span className="text-xs">Upload image (max 5 MB)</span>
              </div>
            )}
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-surface-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Spinner size="sm" />}
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
