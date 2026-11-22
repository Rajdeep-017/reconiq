import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { Landing } from '@/pages/Landing'
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
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    // Pathless layout so the authenticated application keeps its existing
    // absolute URLs while the public landing page owns "/".
    element: <MainLayout />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/uploads', element: <UploadReports /> },
      { path: '/uploads/:upload_id/mapping', element: <MappingReview /> },
      { path: '/mapping', element: <MappingReview /> },
      { path: '/reconciliation', element: <ReconciliationWorkspace /> },
      { path: '/match-review', element: <MatchReview /> },
      { path: '/discrepancies', element: <Discrepancies /> },
      { path: '/claims', element: <ClaimsManagement /> },
      { path: '/analytics', element: <Analytics /> },
      { path: '/partners', element: <Partners /> },
      { path: '/users', element: <Users /> },
      { path: '/settings', element: <Settings /> },
      { path: '/audit-logs', element: <AuditLogs /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
