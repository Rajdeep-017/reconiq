import { api } from '@/lib/api'

export interface PartnerResponse {
  id: string
  name: string
  code: string
  partner_type: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PartnerCreate {
  name: string
  code: string
  partner_type: string
  description?: string
}

export interface PartnerUpdate {
  name?: string
  description?: string
  is_active?: boolean
}

export const partnerService = {
  list: async (): Promise<PartnerResponse[]> => {
    const res = await api.client.get<{ partners: PartnerResponse[]; total: number }>('/partners')
    return res.data.partners
  },

  create: async (data: PartnerCreate): Promise<PartnerResponse> => {
    const res = await api.client.post<PartnerResponse>('/partners', data)
    return res.data
  },

  get: async (id: string): Promise<PartnerResponse> => {
    const res = await api.client.get<PartnerResponse>(`/partners/${id}`)
    return res.data
  },

  update: async (id: string, data: PartnerUpdate): Promise<PartnerResponse> => {
    const res = await api.client.patch<PartnerResponse>(`/partners/${id}`, data)
    return res.data
  },
}
