import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MappingResponse, MappingSaveRequest } from '@/types'

export function useSuggestMapping(uploadId: string) {
  return useQuery({
    queryKey: ['mappings', 'suggest', uploadId],
    queryFn: async () => {
      const res = await api.client.get(`/mappings/suggest/${uploadId}`)
      return res.data
    },
    enabled: !!uploadId,
  })
}

export function useGetMapping(uploadId: string) {
  return useQuery({
    queryKey: ['mappings', uploadId],
    queryFn: async (): Promise<MappingResponse | null> => {
      const res = await api.client.get<MappingResponse | null>(`/mappings/${uploadId}`)
      return res.data
    },
    enabled: !!uploadId,
  })
}

export function useSaveMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MappingSaveRequest) => {
      const res = await api.client.post<MappingResponse>('/mappings', data)
      return res.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mappings', variables.upload_id] })
    },
  })
}
