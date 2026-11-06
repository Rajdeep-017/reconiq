import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { DashboardMetrics } from '@/types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const res = await api.client.get<DashboardMetrics>('/dashboard/metrics')
      return res.data
    },
  })
}
