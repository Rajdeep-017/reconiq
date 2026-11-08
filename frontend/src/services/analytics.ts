import { api } from '@/lib/api'

export interface SettlementTrendPoint {
  name: string
  expected: number
  received: number
}

export interface MatchingTrendPoint {
  name: string
  matched: number
  unmatched: number
}

export interface PartnerPerformancePoint {
  name: string
  rate: number
}

export interface PartnerDiscrepancyPoint {
  name: string
  value: number
}

export interface FreightOverchargePoint {
  name: string
  overcharge: number
}

export interface CODRemittancePoint {
  name: string
  collected: number
  remitted: number
}

export interface ReturnRefundPoint {
  name: string
  value: number
}

export interface ClaimRecoveryPoint {
  name: string
  recovered: number
}

export interface MonthWisePoint {
  name: string
  matched: number
  unmatched: number
}

export const analyticsService = {
  settlementTrends: async (params?: { days?: number }): Promise<SettlementTrendPoint[]> => {
    const res = await api.client.get<SettlementTrendPoint[]>('/analytics/settlement-trends', {
      params,
    })
    return res.data
  },

  matchingTrends: async (params?: { weeks?: number }): Promise<MatchingTrendPoint[]> => {
    const res = await api.client.get<MatchingTrendPoint[]>('/analytics/matching-trends', {
      params,
    })
    return res.data
  },

  partnerPerformance: async (): Promise<PartnerPerformancePoint[]> => {
    const res = await api.client.get<PartnerPerformancePoint[]>('/analytics/partner-performance')
    return res.data
  },

  partnerDiscrepancies: async (): Promise<PartnerDiscrepancyPoint[]> => {
    const res = await api.client.get<PartnerDiscrepancyPoint[]>('/analytics/partner-discrepancies')
    return res.data
  },

  freightOvercharge: async (): Promise<FreightOverchargePoint[]> => {
    const res = await api.client.get<FreightOverchargePoint[]>('/analytics/freight-overcharge')
    return res.data
  },

  codRemittance: async (params?: { days?: number }): Promise<CODRemittancePoint[]> => {
    const res = await api.client.get<CODRemittancePoint[]>('/analytics/cod-remittance', {
      params,
    })
    return res.data
  },

  returnRefund: async (): Promise<ReturnRefundPoint[]> => {
    const res = await api.client.get<ReturnRefundPoint[]>('/analytics/return-refund')
    return res.data
  },

  claimRecovery: async (params?: { days?: number }): Promise<ClaimRecoveryPoint[]> => {
    const res = await api.client.get<ClaimRecoveryPoint[]>('/analytics/claim-recovery', {
      params,
    })
    return res.data
  },

  monthWise: async (): Promise<MonthWisePoint[]> => {
    const res = await api.client.get<MonthWisePoint[]>('/analytics/month-wise')
    return res.data
  },
}
