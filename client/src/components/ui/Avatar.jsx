import React from 'react'
import { cn, getInitials, avatarColor } from '../../lib/utils'

export default function Avatar({ name = '', size = 'md', className }) {
  const sizes = { xs: 'w-5 h-5 text-[10px]', sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base', xl: 'w-12 h-12 text-lg' }
  return (
    <span className={cn('rounded-full inline-flex items-center justify-center font-semibold flex-shrink-0', sizes[size], avatarColor(name), className)}>
      {getInitials(name)}
    </span>
  )
}
