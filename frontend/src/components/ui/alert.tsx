import * as React from 'react'
import { AlertTriangle, Info, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'info' | 'warning' | 'success'
  title?: string
  description?: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
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
  description,
  children,
  onRetry,
  retryLabel = 'Retry',
  ...props
}: AlertProps) {
  const hasContent = title || description || children || onRetry
  if (!hasContent) {
    return null
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-3.5 [&>svg]:top-3.5 [&>svg]:text-current',
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
      <div className="pl-7">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
        {children && <>{children}</>}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-3 top-3.5 mt-px flex items-center gap-1"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
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
