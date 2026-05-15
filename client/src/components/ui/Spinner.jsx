import React from 'react'
import { cn } from '../../lib/utils'

export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' }
  return (
    <div className={cn('rounded-full border-surface-200 border-t-brand-600 animate-spin', s[size], className)} />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-surface-400 font-medium">Loading…</p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-4 w-3/4 rounded-lg" />
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-1/2 rounded-lg" />
      <div className="flex gap-2 mt-2">
        <div className="skeleton h-5 w-16 rounded-lg" />
        <div className="skeleton h-5 w-20 rounded-lg" />
      </div>
    </div>
  )
}
