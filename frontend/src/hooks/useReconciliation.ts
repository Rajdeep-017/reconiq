import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reconciliationService } from '@/services/reconciliation'
import type { ReconRunCreate } from '@/services/reconciliation'

export function useReconciliationRuns(page = 1) {
  return useQuery({
    queryKey: ['reconciliation-runs', page],
    queryFn: () => reconciliationService.listRuns({ page }),
  })
}

export function useReconciliationRun(runId: string) {
  return useQuery({
    queryKey: ['reconciliation-run', runId],
    queryFn: () => reconciliationService.getRun(runId),
    enabled: !!runId,
  })
}

export function useReconciliationResults(runId: string) {
  return useQuery({
    queryKey: ['reconciliation-results', runId],
    queryFn: () => reconciliationService.getResults(runId),
    enabled: !!runId,
  })
}

export function useCreateReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ReconRunCreate) => reconciliationService.createRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] })
    },
  })
}

export function useExecuteReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => reconciliationService.executeRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-runs'] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['reconciliation-results', runId] })
    },
  })
}
