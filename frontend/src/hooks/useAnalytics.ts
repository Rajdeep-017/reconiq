import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/analytics'

export function useSettlementTrends(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'settlement-trends', params],
    queryFn: () => analyticsService.settlementTrends(params),
  })
}

export function useMatchingTrends(params?: { weeks?: number }) {
  return useQuery({
    queryKey: ['analytics', 'matching-trends', params],
    queryFn: () => analyticsService.matchingTrends(params),
  })
}

export function usePartnerPerformance() {
  return useQuery({
    queryKey: ['analytics', 'partner-performance'],
    queryFn: () => analyticsService.partnerPerformance(),
  })
}

export function usePartnerDiscrepancies() {
  return useQuery({
    queryKey: ['analytics', 'partner-discrepancies'],
    queryFn: () => analyticsService.partnerDiscrepancies(),
  })
}

export function useFreightOvercharge() {
  return useQuery({
    queryKey: ['analytics', 'freight-overcharge'],
    queryFn: () => analyticsService.freightOvercharge(),
  })
}

export function useCODRemittance(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'cod-remittance', params],
    queryFn: () => analyticsService.codRemittance(params),
  })
}

export function useReturnRefund() {
  return useQuery({
    queryKey: ['analytics', 'return-refund'],
    queryFn: () => analyticsService.returnRefund(),
  })
}

export function useClaimRecovery(params?: { days?: number }) {
  return useQuery({
    queryKey: ['analytics', 'claim-recovery', params],
    queryFn: () => analyticsService.claimRecovery(params),
  })
}

export function useMonthWise() {
  return useQuery({
    queryKey: ['analytics', 'month-wise'],
    queryFn: () => analyticsService.monthWise(),
  })
}
