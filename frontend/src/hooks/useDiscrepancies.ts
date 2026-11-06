import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { discrepancyService } from '@/services/discrepancies'
import type { DiscrepancyUpdateRequest } from '@/services/discrepancies'

export function useDiscrepancies(params?: {
  run_id?: string
  status?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['discrepancies', params],
    queryFn: () => discrepancyService.list(params),
  })
}

export function useDiscrepancy(id: string) {
  return useQuery({
    queryKey: ['discrepancy', id],
    queryFn: () => discrepancyService.get(id),
    enabled: !!id,
  })
}

export function useUpdateDiscrepancy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscrepancyUpdateRequest }) =>
      discrepancyService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] })
    },
  })
}
