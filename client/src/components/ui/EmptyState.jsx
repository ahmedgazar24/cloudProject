import React from 'react'

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
          <Icon size={24} className="text-surface-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-surface-700 mb-1">{title}</h3>
      {description && <p className="text-xs text-surface-400 max-w-[260px]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
