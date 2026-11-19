import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/analytics'

const ANALYTICS_REFRESH_MS = 60_000

export function useSettlementTrends(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'settlement-trends', params],
    queryFn: () => analyticsService.settlementTrends(params),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useMatchingTrends(params?: { weeks?: number }) {
  return useQuery({
    queryKey: ['analytics', 'matching-trends', params],
    queryFn: () => analyticsService.matchingTrends(params),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function usePartnerPerformance() {
  return useQuery({
    queryKey: ['analytics', 'partner-performance'],
    queryFn: () => analyticsService.partnerPerformance(),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function usePartnerDiscrepancies() {
  return useQuery({
    queryKey: ['analytics', 'partner-discrepancies'],
    queryFn: () => analyticsService.partnerDiscrepancies(),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useFreightOvercharge() {
  return useQuery({
    queryKey: ['analytics', 'freight-overcharge'],
    queryFn: () => analyticsService.freightOvercharge(),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useCODRemittance(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'cod-remittance', params],
    queryFn: () => analyticsService.codRemittance(params),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useReturnRefund() {
  return useQuery({
    queryKey: ['analytics', 'return-refund'],
    queryFn: () => analyticsService.returnRefund(),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useClaimRecovery(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'claim-recovery', params],
    queryFn: () => analyticsService.claimRecovery(params),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}

export function useMonthWise() {
  return useQuery({
    queryKey: ['analytics', 'month-wise'],
    queryFn: () => analyticsService.monthWise(),
    refetchInterval: ANALYTICS_REFRESH_MS,
  })
}
