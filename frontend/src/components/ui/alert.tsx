import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'info' | 'warning' | 'success'
  title?: string
}

const variantIcons = {
  default: <Clock className="h-4 w-4" />,
  destructive: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
}

export function Alert({
  className,
  variant = 'default',
  title,
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-current [&>svg+p]:pl-7',
        {
          default: 'bg-background text-foreground border-border',
          destructive: 'bg-destructive/50 text-destructive border-destructive/20',
          info: 'bg-blue-50 text-blue-700 border-blue-100',
          warning: 'bg-amber-50 text-amber-700 border-amber-100',
          success: 'bg-green-50 text-green-700 border-green-100',
        }[variant],
        className
      )}
      {...props}
    >
      {variantIcons[variant]}
      {title && <AlertTitle>{title}</AlertTitle>}
    </div>
  )
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export function AlertDescription({
  className,
  ...props
}: AlertDescriptionProps) {
  return (
    <p className={cn('text-sm', className)} {...props} />
  )
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <h3 className={cn('mb-1 font-medium', className)} {...props} />
  )
}
