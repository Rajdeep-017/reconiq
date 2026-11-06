'use client'

import { useLocation } from 'react-router-dom'
import {
  Bell,
  User,
  ChevronDown,
  Search,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'

const breadcrumbItems: Record<string, { label: string; href: string }[]> = {
  '/': [{ label: 'Dashboard', href: '/' }],
  '/uploads': [{ label: 'Uploads', href: '/uploads' }],
  '/mapping': [{ label: 'Column Mapping', href: '/mapping' }],
  '/reconciliation': [{ label: 'Reconciliation', href: '/reconciliation' }],
  '/match-review': [{ label: 'Match Review', href: '/match-review' }],
  '/discrepancies': [{ label: 'Discrepancies', href: '/discrepancies' }],
  '/claims': [{ label: 'Claims', href: '/claims' }],
  '/analytics': [{ label: 'Analytics', href: '/analytics' }],
  '/partners': [{ label: 'Partners', href: '/partners' }],
  '/settings': [{ label: 'Settings', href: '/settings' }],
}

export function TopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const crumbs = breadcrumbItems[location.pathname] || [
    { label: location.pathname.split('/').pop() || 'Dashboard', href: location.pathname },
  ]

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="relative inline-flex h-5 w-5">
            <span className="block top-1/2 h-[1px] w-full rotate-0 origin-center bg-muted transition-transform duration-300"></span>
            <span className="block top-1/2 h-[1px] w-full rotate-0 origin-center bg-muted transition-transform duration-300"></span>
            <span className="block top-1/2 h-[1px] w-full rotate-45 origin-center bg-muted transition-transform duration-300"></span>
          </div>
        </button>
        <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
          <span className="text-xs">{crumbs[crumbs.length - 1].label}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search reports, orders, claims…"
              className="flex h-9 w-full rounded-l-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 sm:rounded-none sm:rounded-l-md"
            />
          </div>
        </div>
        <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 px-3">
          <Calendar className="h-4 w-4" />
          <span>This month</span>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 flex h-1.5 w-1.5 items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>New upload processed</DropdownMenuItem>
            <DropdownMenuItem>Reconciliation run completed</DropdownMenuItem>
            <DropdownMenuItem>Claim submitted for review</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Mark all as read</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative flex items-center gap-2 overflow-hidden">
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
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Organization settings</DropdownMenuItem>
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
