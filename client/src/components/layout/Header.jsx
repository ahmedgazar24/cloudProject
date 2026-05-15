import React from 'react'
import { Search, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header({ title, actions }) {
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-surface-100 flex-shrink-0">
      <h1 className="text-base font-semibold text-surface-900">{title}</h1>

      <div className="flex items-center gap-2">
        {actions}
        <button className="btn-ghost rounded-xl p-2 relative">
          <Bell size={17} className="text-surface-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  )
}
