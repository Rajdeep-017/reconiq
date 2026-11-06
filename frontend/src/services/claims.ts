import { api } from '@/lib/api'

export interface ClaimCreateRequest {
  discrepancy_id: string
  claim_type: string
  notes?: string
}

export interface ClaimUpdateRequest {
  status?: string
  recovered_amount?: string | number
  notes?: string
}

export interface ClaimResponse {
  id: string
  claim_reference: string
  discrepancy_id: string
  claim_type: string
  claim_amount: string | number
  recovered_amount: string | number
  status: string
  notes: string | null
  created_at: string
}

export const claimService = {
  list: async (params?: {
    status?: string
    page?: number
    page_size?: number
  }): Promise<ClaimResponse[]> => {
    const res = await api.client.get<ClaimResponse[]>('/claims', { params })
    return res.data
  },

  create: async (data: ClaimCreateRequest): Promise<ClaimResponse> => {
    const res = await api.client.post<ClaimResponse>('/claims', data)
    return res.data
  },

  update: async (
    id: string,
    data: ClaimUpdateRequest
  ): Promise<ClaimResponse> => {
    const res = await api.client.patch<ClaimResponse>(`/claims/${id}`, data)
    return res.data
  },
}
