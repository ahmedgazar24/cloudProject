import React, { useState, useEffect, useRef } from 'react'
import { Edit2, Trash2, Send, Clock, Tag, User, Calendar, Flag, ExternalLink, ChevronDown } from 'lucide-react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { Spinner } from '../ui/Spinner'
import { getPriority, getStatus, fmtDate, fmtRelative, isOverdue, cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { STATUSES } from '../../lib/utils'

const STATUS_OPTS = STATUSES.map(s => ({ value: s.id, label: s.label }))

export default function TaskDetail({ task, open, onClose, onEdit, onDeleted, onStatusChange }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [audit, setAudit]       = useState([])
  const [comment, setComment]   = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('comments')
  const bottomRef = useRef(null)

  const canEdit   = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const canStatus = canEdit || (task?.assigneeId === user?.userId)

  useEffect(() => {
    if (!open || !task) return
    setLoading(true)
    Promise.all([
      api.get(`/tasks/${task.taskId}/comments`),
      api.get(`/tasks/${task.taskId}/audit`),
    ]).then(([cr, ar]) => {
      setComments(cr.data.comments ?? [])
      setAudit(ar.data.logs ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [open, task])

  useEffect(() => {
    if (tab === 'comments') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments, tab])

  const sendComment = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/tasks/${task.taskId}/comments`, { body: comment })
      setComments(c => [...c, data.comment])
      setComment('')
    } catch {
      toast.error('Failed to send comment')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value
    try {
      await api.patch(`/tasks/${task.taskId}`, { status: newStatus })
      onStatusChange(task.taskId, newStatus)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    try {
      await api.delete(`/tasks/${task.taskId}`)
      toast.success('Task deleted')
      onDeleted(task.taskId)
      onClose()
    } catch {
      toast.error('Failed to delete task')
    }
  }

  if (!task) return null
  const prio   = getPriority(task.priority)
  const status = getStatus(task.status)
  const overdue = isOverdue(task.deadline)

  return (
    <Modal open={open} onClose={onClose} size="xl">
      <div className="flex flex-col lg:flex-row h-full min-h-[500px]">

        {/* Left: Task details */}
        <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-surface-100 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={prio.color} dot>{prio.label}</Badge>
                <Badge className="bg-surface-100 text-surface-500">{task.teamName ?? task.teamId}</Badge>
                {task.projectName && <Badge className="bg-brand-50 text-brand-700">{task.projectName}</Badge>}
              </div>
              <h2 className="text-xl font-bold text-surface-900 leading-tight">{task.title}</h2>
            </div>
            {canEdit && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onEdit(task)} className="btn-ghost p-2 rounded-xl">
                  <Edit2 size={15} />
                </button>
                <button onClick={handleDelete} className="btn-danger p-2 rounded-xl">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-surface-600 leading-relaxed mb-5 whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          {/* Image */}
          {task.imageUrl && (
            <div className="mb-5">
              <img src={task.imageUrl} alt="attachment" className="rounded-xl border border-surface-200 max-h-48 object-cover w-full" />
              {task.resizedImageUrl && (
                <p className="text-[10px] text-surface-400 mt-1">Thumbnail available (Lambda processed)</p>
              )}
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-5">
            <MetaItem icon={User} label="Assignee" value={task.assigneeName ?? '—'} />
            <MetaItem icon={Calendar} label="Deadline"
              value={task.deadline ? fmtDate(task.deadline) : '—'}
              valueClass={overdue ? 'text-red-500 font-semibold' : undefined}
            />
            <MetaItem icon={Tag} label="Team" value={task.teamName ?? task.teamId ?? '—'} />
            <MetaItem icon={Clock} label="Created" value={fmtRelative(task.createdAt)} />
          </div>

          {/* Status selector */}
          <div>
            <label className="label">Status</label>
            <select
              className="input text-sm"
              value={task.status}
              onChange={handleStatusChange}
              disabled={!canStatus}
            >
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Right: Comments + Audit */}
        <div className="w-full lg:w-80 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-surface-100 flex-shrink-0">
            {['comments', 'activity'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex-1 py-3 text-xs font-semibold capitalize transition-colors',
                  tab === t ? 'text-brand-700 border-b-2 border-brand-600' : 'text-surface-500 hover:text-surface-800'
                )}>
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && <div className="flex justify-center py-8"><Spinner /></div>}

            {!loading && tab === 'comments' && (
              <>
                {comments.length === 0 && (
                  <p className="text-xs text-surface-400 text-center py-8">No comments yet. Be the first!</p>
                )}
                {comments.map(c => (
                  <div key={c.commentId} className="flex gap-2.5 animate-fade-in">
                    <Avatar name={c.authorName} size="sm" className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-surface-800">{c.authorName}</span>
                        <span className="text-[10px] text-surface-400">{fmtRelative(c.createdAt)}</span>
                      </div>
                      <div className="bg-surface-50 rounded-xl rounded-tl-none p-3 text-xs text-surface-700 leading-relaxed">
                        {c.body}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </>
            )}

            {!loading && tab === 'activity' && (
              <>
                {audit.length === 0 && (
                  <p className="text-xs text-surface-400 text-center py-8">No activity yet.</p>
                )}
                {audit.map((a, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <Clock size={12} className="text-surface-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-surface-700">{a.userName ?? 'Someone'}</span>
                      <span className="text-surface-500"> moved to </span>
                      <span className="font-medium text-surface-700">{getStatus(a.toStatus).label}</span>
                      <span className="block text-surface-400">{fmtRelative(a.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Comment input */}
          {tab === 'comments' && (
            <div className="border-t border-surface-100 p-3 flex-shrink-0">
              <div className="flex gap-2">
                <Avatar name={user?.name} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex gap-2">
                  <input
                    className="input flex-1 text-xs py-2"
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendComment())}
                  />
                  <button onClick={sendComment} disabled={sending || !comment.trim()} className="btn-primary px-3 py-2">
                    {sending ? <Spinner size="sm" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function MetaItem({ icon: Icon, label, value, valueClass }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wider">
        <Icon size={10} />{label}
      </span>
      <span className={cn('text-xs font-medium text-surface-700', valueClass)}>{value}</span>
    </div>
  )
}
