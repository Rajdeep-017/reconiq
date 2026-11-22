import { useQuery } from '@tanstack/react-query'
import { publicService } from '@/services/public'

export function usePublicOverview() {
  return useQuery({
    queryKey: ['public-overview'],
    queryFn: publicService.overview,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })
}
