import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface EmptyDataStateProps {
  title: string
  description: string
  actionLabel: string
  to: string
}

export function EmptyDataState({
  title,
  description,
  actionLabel,
  to,
}: EmptyDataStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center" role="status">
      <p className="font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" asChild>
        <Link to={to}>{actionLabel}</Link>
      </Button>
    </div>
  )
}
