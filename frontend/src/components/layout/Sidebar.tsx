'use client'

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Upload,
  ClipboardList,
  Scale,
  Shapes,
  FileText,
  AlertCircle,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Upload Reports',
    href: '/uploads',
    icon: Upload,
  },
  {
    name: 'Mapping Review',
    href: '/mapping',
    icon: ClipboardList,
  },
  {
    name: 'Reconciliation',
    href: '/reconciliation',
    icon: Scale,
  },
  {
    name: 'Match Review',
    href: '/match-review',
    icon: Shapes,
  },
  {
    name: 'Discrepancies',
    href: '/discrepancies',
    icon: AlertCircle,
  },
  {
    name: 'Claims',
    href: '/claims',
    icon: FileText,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: FileText,
  },
  {
    name: 'Partners',
    href: '/partners',
    icon: Users,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  useEffect(() => {
    // Collapse sidebar on mobile by default
    if (window.innerWidth < 768) {
      setCollapsed(true)
      setMobileOpen(false)
    }
  }, [])

  const isActive = (href: string) => location.pathname === href

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 border-r border-border bg-background transition-all duration-300',
          collapsed ? '-translate-x-full md:translate-x-0 md:w-14' : 'translate-x-0',
          !collapsed && 'shadow-lg',
          mobileOpen && !collapsed && 'translate-x-0 md:-translate-x-full'
        )}
      >
        {/* Brand */}
        {!collapsed && (
          <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-reconiq-600 text-white">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-lg font-bold tracking-tight">ReconIQ</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => {
                  if (window.innerWidth < 768) setMobileOpen(false)
                }}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary-foreground')} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          {!collapsed && user ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                <span className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate-title">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate-title">{user.role.replace('_', ' ')}</p>
              </div>
              <button
                onClick={logout}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ChevronLeft className={cn('h-4 w-4', collapsed && 'rotate-180')} />
              {!collapsed && <span>Collapse</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile toggle button */}
      {!collapsed && window.innerWidth < 768 && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
