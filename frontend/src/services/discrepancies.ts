import { api } from '@/lib/api'

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
  }) => {
    const res = await api.client.get('/discrepancies', { params })
    return res.data
  },

  get: async (id: string) => {
    const res = await api.client.get(`/discrepancies/${id}`)
    return res.data
  },

  update: async (id: string, data: DiscrepancyUpdateRequest) => {
    const res = await api.client.patch(`/discrepancies/${id}`, data)
    return res.data
  },
}
