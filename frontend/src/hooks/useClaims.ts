import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { claimService } from '@/services/claims'
import type { ClaimCreateRequest, ClaimUpdateRequest } from '@/services/claims'
import { invalidateFinancialData } from '@/lib/invalidation'

export function useClaims(params?: {
  status?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['claims', params],
    queryFn: () => claimService.list(params),
  })
}

export function useCreateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ClaimCreateRequest) => claimService.create(data),
    onSuccess: () => invalidateFinancialData(queryClient),
  })
}

export function useUpdateClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClaimUpdateRequest }) =>
      claimService.update(id, data),
    onSuccess: () => invalidateFinancialData(queryClient),
  })
}
