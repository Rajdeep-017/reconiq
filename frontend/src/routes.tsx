import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { UploadReports } from '@/pages/UploadReports'
import { MappingReview } from '@/pages/MappingReview'
import { ReconciliationWorkspace } from '@/pages/ReconciliationWorkspace'
import { MatchReview } from '@/pages/MatchReview'
import { Discrepancies } from '@/pages/Discrepancies'
import { ClaimsManagement } from '@/pages/ClaimsManagement'
import { Analytics } from '@/pages/Analytics'
import { Partners } from '@/pages/Partners'
import { Users } from '@/pages/Users'
import { Settings } from '@/pages/Settings'
import { AuditLogs } from '@/pages/AuditLogs'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'uploads', element: <UploadReports /> },
      { path: 'mapping', element: <MappingReview /> },
      { path: 'reconciliation', element: <ReconciliationWorkspace /> },
      { path: 'match-review', element: <MatchReview /> },
      { path: 'discrepancies', element: <Discrepancies /> },
      { path: 'claims', element: <ClaimsManagement /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'partners', element: <Partners /> },
      { path: 'users', element: <Users /> },
      { path: 'settings', element: <Settings /> },
      { path: 'audit-logs', element: <AuditLogs /> },
    ],
  },
])
