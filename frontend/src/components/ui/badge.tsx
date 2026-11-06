import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {}

const badgeVariants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-input bg-transparent',
  success: 'bg-green-100 text-green-800 border border-green-200',
  warning: 'bg-amber-100 text-amber-800 border border-amber-200',
  error: 'bg-red-100 text-red-800 border border-red-200',
  info: 'bg-blue-100 text-blue-800 border border-blue-200',
}

export function Badge({
  className,
  variant,
  ...props
}: BadgeProps & { variant?: keyof typeof badgeVariants }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        badgeVariants[variant || 'default'],
        className
      )}
      {...props}
    />
  )
}
