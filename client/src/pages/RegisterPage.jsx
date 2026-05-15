import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui/Spinner'
import api from '../lib/api'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'MANAGER',  label: 'Manager'  },
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', teamId: '' })
  const [teams, setTeams]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/teams').then(r => setTeams(r.data.teams ?? [])).catch(() => {})
  }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-surface-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-brand-700/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">FlowBoard</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-modal">
          <h1 className="text-xl font-bold text-white mb-1">Create account</h1>
          <p className="text-sm text-brand-300 mb-6">Join your team on FlowBoard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full name',      key: 'name',     type: 'text',     placeholder: 'Ali Hassan' },
              { label: 'Email',          key: 'email',    type: 'email',    placeholder: 'ali@company.com' },
              { label: 'Password',       key: 'password', type: 'password', placeholder: '••••••••' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-brand-200 mb-1.5">{label}</label>
                <input type={type} required placeholder={placeholder}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
                  value={form[key]} onChange={set(key)} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-brand-200 mb-1.5">Role</label>
              <select className="w-full rounded-xl border border-white/10 bg-brand-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                value={form.role} onChange={set('role')}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {form.role === 'EMPLOYEE' && (
              <div>
                <label className="block text-xs font-semibold text-brand-200 mb-1.5">Team</label>
                <select className="w-full rounded-xl border border-white/10 bg-brand-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                  value={form.teamId} onChange={set('teamId')}>
                  <option value="">Select team…</option>
                  {teams.map(t => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
                </select>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-all mt-2 disabled:opacity-60">
              {loading && <Spinner size="sm" />}
              Create account
            </button>
          </form>

          <p className="text-xs text-center text-white/40 mt-6">
            Have an account?{' '}
            <Link to="/login" className="text-brand-300 hover:text-brand-200 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
