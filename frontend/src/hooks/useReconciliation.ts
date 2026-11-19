import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reconciliationService } from '@/services/reconciliation'
import type { ReconRunCreate } from '@/services/reconciliation'
import { ACTIVE_RUN_STATUSES } from '@/types'
import { invalidateFinancialData } from '@/lib/invalidation'

const RUNS_KEY = ['reconciliation-runs'] as const

export function useReconciliationRuns(page = 1) {
  return useQuery({
    queryKey: [...RUNS_KEY, page],
    queryFn: () => reconciliationService.listRuns({ page }),
    // Poll while any run is created/running so the workspace updates on its own.
    refetchInterval: (query) => {
      const runs = (query.state.data as Awaited<
        ReturnType<typeof reconciliationService.listRuns>
      > | undefined) || []
      const hasActive = runs.some((r) => (ACTIVE_RUN_STATUSES as string[]).includes(r.status))
      return hasActive ? 3000 : false
    },
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
    onSuccess: () => invalidateFinancialData(queryClient),
  })
}

export function useExecuteReconciliationRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => reconciliationService.executeRun(runId),
    onSuccess: (run) => {
      // Execution writes results, discrepancies and claims.
      queryClient.setQueryData(['reconciliation-run', run.id], run)
      return Promise.all([
        invalidateFinancialData(queryClient),
        queryClient.invalidateQueries({ queryKey: ['reconciliation-results', run.id] }),
      ])
    },
  })
}
