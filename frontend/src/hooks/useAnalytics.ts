import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/analytics'

export function useSettlementTrends() {
  return useQuery({
    queryKey: ['analytics', 'settlement-trends'],
    queryFn: () => analyticsService.settlementTrends(),
  })
}

export function useMatchingTrends() {
  return useQuery({
    queryKey: ['analytics', 'matching-trends'],
    queryFn: () => analyticsService.matchingTrends(),
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

export function useCODRemittance() {
  return useQuery({
    queryKey: ['analytics', 'cod-remittance'],
    queryFn: () => analyticsService.codRemittance(),
  })
}

export function useReturnRefund() {
  return useQuery({
    queryKey: ['analytics', 'return-refund'],
    queryFn: () => analyticsService.returnRefund(),
  })
}

export function useClaimRecovery() {
  return useQuery({
    queryKey: ['analytics', 'claim-recovery'],
    queryFn: () => analyticsService.claimRecovery(),
  })
}

export function useMonthWise() {
  return useQuery({
    queryKey: ['analytics', 'month-wise'],
    queryFn: () => analyticsService.monthWise(),
  })
}
