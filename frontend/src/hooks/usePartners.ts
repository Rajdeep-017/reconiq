import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { partnerService } from '@/services/partners'
import type { PartnerCreate } from '@/services/partners'

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: () => partnerService.list(),
  })
}

export function useCreatePartner() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PartnerCreate) => partnerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] })
    },
  })
}
