import { api } from '@/lib/api'

export interface ReconRunResponse {
  id: string
  name: string
  recon_type: string
  status: string
  total_source: number
  total_target: number
  matched_count: number
  unmatched_count: number
  discrepancy_count: number
  total_expected: number | string
  total_received: number | string
  total_discrepancy: number | string
}

export interface ReconResultResponse {
  id: string
  run_id: string
  order_reference: string
  match_method: string
  match_status: string
  confidence_score: number | string
  expected_amount: number | string
  actual_amount: number | string
  difference: number | string
}

export interface ReconRunCreate {
  name: string
  recon_type: string
  source_upload_id: string
  target_upload_id: string
}

export const reconciliationService = {
  listRuns: async (params?: { page?: number }): Promise<ReconRunResponse[]> => {
    const res = await api.client.get<ReconRunResponse[]>('/reconciliation', { params })
    return res.data
  },

  createRun: async (data: ReconRunCreate): Promise<ReconRunResponse> => {
    const res = await api.client.post<ReconRunResponse>('/reconciliation', data)
    return res.data
  },

  executeRun: async (runId: string): Promise<ReconRunResponse> => {
    const res = await api.client.post<ReconRunResponse>(`/reconciliation/${runId}/execute`)
    return res.data
  },

  getRun: async (runId: string): Promise<ReconRunResponse> => {
    const res = await api.client.get<ReconRunResponse>(`/reconciliation/${runId}`)
    return res.data
  },

  getResults: async (runId: string): Promise<ReconResultResponse[]> => {
    const res = await api.client.get<ReconResultResponse[]>(`/reconciliation/${runId}/results`)
    return res.data
  },
}
