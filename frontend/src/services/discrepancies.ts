import { api } from '@/lib/api'
import type { DiscrepancyResponse } from '@/types'

export interface DiscrepancyUpdateRequest {
  status: string
  resolution?: string
}

export const discrepancyService = {
  list: async (params?: {
    run_id?: string
    status?: string
    page?: number
    page_size?: number
  }): Promise<DiscrepancyResponse[]> => {
    const res = await api.client.get<DiscrepancyResponse[]>('/discrepancies', { params })
    return res.data
  },

  get: async (id: string): Promise<DiscrepancyResponse> => {
    const res = await api.client.get<DiscrepancyResponse>(`/discrepancies/${id}`)
    return res.data
  },

  update: async (
    id: string,
    data: DiscrepancyUpdateRequest
  ): Promise<DiscrepancyResponse> => {
    const res = await api.client.patch<DiscrepancyResponse>(`/discrepancies/${id}`, data)
    return res.data
  },
}
