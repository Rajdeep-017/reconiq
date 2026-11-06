import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

export interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}
export function TableCaption({
  className,
  ...props
}: TableCaptionProps) {
  return (
    <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  )
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead className={cn('[&_tr]:border-b', className)} {...props} />
  )
}

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
}

export interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
export function TableFooter({ className, ...props }: TableFooterProps) {
  return (
    <tfoot className={cn('[&_tr]:border-b', className)} {...props} />
  )
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-accent data-[state=selected]:bg-accent',
        className
      )}
      {...props}
    />
  )
}

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableCellElement> {}
export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

export interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  colSpan?: number
}

export function TableCell({ className, colSpan, ...props }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn('p-4 align-middle [&:has([role=checkbox])]:pl-0', className)}
      {...props}
    />
  )
}

export interface TableEmptyProps extends React.HTMLAttributes<HTMLTableRowElement> {}
export function TableEmpty({ className, ...props }: TableEmptyProps) {
  return (
    <tr className={cn('text-muted-foreground', className)} {...props}>
      <td colSpan={99} className="h-24 text-center">
        No data available
      </td>
    </tr>
  )
}
