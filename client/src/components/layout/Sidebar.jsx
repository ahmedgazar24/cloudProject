import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, FolderOpen, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, BarChart3, Bell, Zap
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'
import { cn } from '../../lib/utils'

const navItems = (role) => {
  const base = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks',      icon: CheckSquare,     label: 'Tasks'     },
    { to: '/projects',   icon: FolderOpen,      label: 'Projects'  },
  ]
  if (role === 'MANAGER' || role === 'ADMIN') {
    base.push({ to: '/teams',  icon: Users,    label: 'Teams'   })
    base.push({ to: '/analytics', icon: BarChart3, label: 'Analytics' })
  }
  return base
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const items = navItems(user?.role)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className={cn(
      'flex flex-col bg-white border-r border-surface-200 transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-5 border-b border-surface-100', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-display font-bold text-surface-900 text-base tracking-tight">FlowBoard</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-100',
              collapsed && 'justify-center px-0 py-2.5',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-500 hover:bg-surface-50 hover:text-surface-900'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={cn('border-t border-surface-100 p-3 space-y-1', collapsed && 'p-2')}>
        {/* User info */}
        <div className={cn('flex items-center gap-2.5 rounded-xl px-2 py-2 mb-2', collapsed && 'justify-center px-0')}>
          <Avatar name={user?.name} size="sm" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-surface-800 truncate">{user?.name}</p>
              <p className="text-[10px] text-surface-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn('btn-ghost w-full rounded-xl text-xs justify-start gap-2', collapsed && 'justify-center')}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn('btn-ghost w-full rounded-xl text-xs text-red-500 hover:bg-red-50 justify-start gap-2', collapsed && 'justify-center')}
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
