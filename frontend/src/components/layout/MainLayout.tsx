'use client'

import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { Toaster } from '@/components/ui/toaster'
import { useAuth } from '@/hooks/useAuth'

export function MainLayout() {
  const { loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // On mobile the sidebar is a hidden overlay drawer by default.
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
      setMobileOpen(false)
    }
  }, [isMobile])

  const toggle = useCallback(() => {
    if (isMobile) setMobileOpen((prev) => !prev)
    else setCollapsed((prev) => !prev)
  }, [isMobile])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-border border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div
      className="app-shell h-screen w-full min-h-screen grid bg-background"
      style={
        {
          // Grid track for the sidebar column. On mobile it collapses to 0 so the
          // sidebar can render as a fixed overlay drawer without leaving a gap.
          '--sidebar-width': isMobile ? '0px' : collapsed ? '64px' : '248px',
          '--sidebar-collapsed-width': '64px',
          '--header-height': '72px',
        } as React.CSSProperties
      }
    >
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={toggle}
        isMobile={isMobile}
      />
      <div className="main-area flex flex-col min-w-0 min-h-0">
        <TopHeader onMenuClick={toggle} />
        <main className="main-content flex-1 overflow-y-auto min-w-0 p-6 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
