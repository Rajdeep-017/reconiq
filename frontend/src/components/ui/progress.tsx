import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

export function Progress({ className, value, ...props }: ProgressProps) {
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full border border-border bg-secondary', className)}
      {...props}
    >
      <div className="h-full flex-1 bg-primary transition-all duration-300" style={{ width: `${value ?? 0}%` }} />
    </div>
  )
}
