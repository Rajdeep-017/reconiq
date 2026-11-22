export type PublicOverviewMode = 'demo'

export interface PublicTrendPoint {
  label: string
  matched: number
  pending: number
}

export interface PublicOverviewCounts {
  total_transactions: number
  matched_transactions: number
  pending_transactions: number
  matching_rate: number
  reconciliation_status: string
}

export interface PublicMatchBreakdown {
  label: string
  count: number
}

export interface PublicSettlementPreview {
  settlement_amount: number
  expected_amount: number
  actual_amount: number
  difference: number
  status: string
  processing_state: string
}

export interface PublicDiscrepancyCategory {
  category: string
  count: number
}

export interface PublicDiscrepancyPreview {
  open: number
  under_review: number
  resolved: number
  categories: PublicDiscrepancyCategory[]
}

export interface PublicClaimPreview {
  total: number
  draft: number
  submitted: number
  under_review: number
  resolved: number
  recovered_amount: number
}

export interface PublicOverview {
  mode: PublicOverviewMode
  disclaimer: string
  generated_at: string
  overview: PublicOverviewCounts
  trend: PublicTrendPoint[]
  matching_breakdown: PublicMatchBreakdown[]
  settlement: PublicSettlementPreview
  discrepancies: PublicDiscrepancyPreview
  claims: PublicClaimPreview
}
