'use client'

import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { Toaster } from '@/components/ui/toaster'
import { useAuth } from '@/hooks/useAuth'

export function MainLayout() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-border border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
