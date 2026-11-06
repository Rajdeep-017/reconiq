import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ReconRunResponse, ReconResultResponse, ReconRunCreate } from '@/types'

export function useReconciliationRuns(page = 1) {
  return useQuery({
    queryKey: ['reconciliation-runs', page],
    queryFn: async (): Promise<ReconRunResponse[]> => {
      const res = await api.client.get<ReconRunResponse[]>('/reconciliation', {
        params: { page },
      })
      return res.data
    },
  })
}

export function useReconciliationRun(runId: string) {
  return useQuery({
    queryKey: ['reconciliation-run', runId],
    queryFn: async (): Promise<ReconRunResponse> => {
      const res = await api.client.get<ReconRunResponse>(`/reconciliation/${runId}`)
      return res.data
    },
    enabled: !!runId,
  })
}

export function useReconciliationResults(runId: string) {
  return useQuery({
    queryKey: ['reconciliation-results', runId],
    queryFn: async (): Promise<ReconResultResponse[]> => {
      const res = await api.client.get<ReconResultResponse[]>(`/reconciliation/${runId}/results`)
      return res.data
    },
    enabled: !!runId,
  })
}

export function useCreateReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReconRunCreate) => {
      const res = await api.client.post<ReconRunResponse>('/reconciliation', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] })
    },
  })
}

export function useExecuteReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await api.client.post<ReconRunResponse>(`/reconciliation/${runId}/execute`)
      return res.data
    },
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-results', runId] })
    },
  })
}
