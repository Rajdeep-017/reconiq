'use client'

import { Link, useLocation } from 'react-router-dom'
import {
  User,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const breadcrumbItems: Record<string, { label: string; href: string }[]> = {
  '/': [{ label: 'Dashboard', href: '/' }],
  '/dashboard': [{ label: 'Dashboard', href: '/' }],
  '/uploads': [{ label: 'Uploads', href: '/uploads' }],
  '/mapping': [{ label: 'Column Mapping', href: '/mapping' }],
  '/reconciliation': [{ label: 'Reconciliation', href: '/reconciliation' }],
  '/discrepancies': [{ label: 'Discrepancies', href: '/discrepancies' }],
  '/claims': [{ label: 'Claims', href: '/claims' }],
  '/analytics': [{ label: 'Analytics', href: '/analytics' }],
  '/partners': [{ label: 'Partners', href: '/partners' }],
  '/users': [{ label: 'Users', href: '/users' }],
  '/settings': [{ label: 'Settings', href: '/settings' }],
  '/match-review': [{ label: 'Match Review', href: '/match-review' }],
  '/audit-logs': [{ label: 'Audit Logs', href: '/audit-logs' }],
}

export function TopHeader({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const isMappingRoute = /^\/uploads\/[^/]+\/mapping$/.test(location.pathname)
  const crumbs = breadcrumbItems[location.pathname] || (isMappingRoute
    ? breadcrumbItems['/mapping']
    : [{ label: location.pathname.split('/').pop() || 'Dashboard', href: location.pathname }])

  return (
    <header
      className={cn(
        'flex h-[var(--header-height)] items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 shrink-0',
        onMenuClick ? '' : 'pl-0'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-accent-foreground"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            <div className="relative inline-flex h-5 w-5">
              <span className="block top-1/2 h-[1px] w-full rotate-0 origin-center bg-muted transition-transform duration-300"></span>
              <span className="block top-1/2 h-[1px] w-full rotate-0 origin-center bg-muted transition-transform duration-300"></span>
              <span className="block top-1/2 h-[1px] w-full rotate-45 origin-center bg-muted transition-transform duration-300"></span>
            </div>
          </button>
        )}
        <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground min-w-0">
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-medium truncate-title">{crumbs[crumbs.length - 1].label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 min-w-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative flex items-center gap-2 overflow-hidden shrink-0 min-w-fit">
              <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                {user ? (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="hidden md:flex flex-col min-w-[120px]">
                {user ? (
                  <>
                    <p className="text-sm font-medium text-foreground truncate-title">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate-title">{user.email}</p>
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground">Account</p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/settings">Account settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/users">Team members</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
