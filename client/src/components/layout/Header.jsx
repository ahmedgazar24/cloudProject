import React from 'react'
import NotificationsMenu from './NotificationsMenu'

export default function Header({ title, actions }) {
  return (
    <header className="flex items-center justify-between h-14 px-6 bg-white border-b border-surface-100 flex-shrink-0">
      <h1 className="text-base font-semibold text-surface-900">{title}</h1>

      <div className="flex items-center gap-2">
        {actions}
        <NotificationsMenu />
      </div>
    </header>
  )
}
