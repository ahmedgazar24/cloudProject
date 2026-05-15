import React from 'react'
import { cn } from '../../lib/utils'

export default function Badge({ children, className, dot }) {
  return (
    <span className={cn('badge', className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
      {children}
    </span>
  )
}
