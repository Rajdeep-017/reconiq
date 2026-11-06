'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload Reports', href: '/uploads', icon: Upload },
  { name: 'Column Mapping', href: '/mapping', icon: ClipboardList },
  { name: 'Reconciliation', href: '/reconciliation', icon: Scale },
  { name: 'Match Review', href: '/match-review', icon: Shapes },
  { name: 'Discrepancies', href: '/discrepancies', icon: AlertCircle },
  { name: 'Claims', href: '/claims', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: FileText },
  { name: 'Partners', href: '/partners', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  isMobile: boolean
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  isMobile,
}: SidebarProps) {
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(mobileOpen)
  const location = useLocation()
  const { user, logout } = useAuth()

  // Keep the drawer closed on mobile when resizing back above the breakpoint.
  useEffect(() => {
    setSidebarMobileOpen(mobileOpen)
    if (!isMobile) return
    if (window.innerWidth >= 768) setSidebarMobileOpen(false)
  }, [mobileOpen, isMobile])

  const isActive = (href: string) => location.pathname === href

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarMobileOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* Sidebar - own grid column (desktop) / fixed overlay drawer (mobile) */}
      <aside
        className={cn(
          'flex flex-col border-r border-border bg-background shrink-0 h-screen transition-all duration-300',
          !isMobile ? 'sticky top-0' : 'fixed inset-y-0 left-0 z-50',
          collapsed
            ? 'w-[64px] max-w-[64px]'
            : 'w-[248px] max-w-[248px]',
          !collapsed && 'shadow-sm',
          isMobile && (sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full')
        )}
      >
        {/* Brand */}
        {!collapsed && (
          <div className="flex h-[var(--header-height)] items-center gap-3 px-4 border-b border-border shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <div className="w-4 h-4 bg-white rounded-sm" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">ReconIQ</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto shrink-0">
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
                    : 'text-muted-foreground hover:bg-secondary hover:text-accent-foreground'
                )}
                onClick={() => {
                  if (isMobile) setSidebarMobileOpen(false)
                }}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary-foreground')} />
                {!collapsed && <span className="text-foreground">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0">
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
              <button onClick={logout} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-accent-foreground transition-colors"
            >
              <ChevronLeft className={cn('h-4 w-4', collapsed && 'rotate-180')} />
              {!collapsed && <span className="text-sm">Collapse</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
