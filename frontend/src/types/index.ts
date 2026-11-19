// Synced with backend enums:
//   app/models/upload.py (DocumentType, UploadStatus)
//   app/models/reconciliation.py (ReconStatus, ReconType, MatchStatus)
//   app/models/discrepancy.py (DiscrepancyType, DiscrepancyStatus, ClaimStatus)
//   app/modules/matching/common.py (StreamStatus)

export type DocumentType =
  | 'orders'
  | 'settlements'
  | 'cod_remittances'
  | 'freight_invoices'
  | 'returns'
  | 'warehouse_scans'

export type UserRole =
  | 'finance_executive'
  | 'finance_cofounder'
  | 'admin'
  | 'member'
  | 'viewer'

export type UploadStatus =
  | 'uploaded'
  | 'parsed'
  | 'mapped'
  | 'processing'
  | 'processed'
  | 'failed'

/** Statuses that move server-side and require polling. */
export const ACTIVE_UPLOAD_STATUSES: UploadStatus[] = ['uploaded', 'parsed', 'mapped', 'processing']

export type ReconRunStatus = 'created' | 'running' | 'completed' | 'failed'

export const ACTIVE_RUN_STATUSES: ReconRunStatus[] = ['created', 'running']

/** Engine stream pairs: recon_type = 'settlement' | 'cod' | 'freight' | 'return'. */
export type ReconType = 'settlement' | 'cod' | 'freight' | 'return'

export type MatchStatus =
  | 'matched'
  | 'partial'
  | 'unmatched'
  | 'review_pending'
  | 'confirmed'
  | 'rejected'

export type StreamStatus =
  | 'settled'
  | 'short_paid'
  | 'unpaid_past_due'
  | 'freight_overcharged'
  | 'return_not_received'
  | 'settled_late'
  | 'not_yet_due'
  | 'missing_freight_invoice'

export type DiscrepancyStatus =
  | 'detected'
  | 'verified'
  | 'disputed'
  | 'resolved'
  | 'dismissed'

export type ClaimStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'under_review'
  | 'resolved'
  | 'rejected'
  | 'closed'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  org_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  full_name: string
  password: string
  role?: UserRole
}

export interface UploadResponse {
  id: string
  original_filename: string
  stored_filename: string
  file_type: string
  document_type: DocumentType
  file_size: number
  sha256_checksum: string
  row_count: number | null
  processed_count: number
  rejected_count: number
  duplicate_count: number
  column_headers: Record<string, unknown> | null
  sample_data: Record<string, unknown> | null
  status: UploadStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface UploadListResponse {
  uploads: UploadResponse[]
  total: number
  page: number
  page_size: number
}

export interface DashboardMetrics {
  total_uploads: number
  total_orders: number
  matched_orders: number
  unmatched_orders: number
  matching_rate: number
  total_expected: string | number
  total_received: string | number
  total_discrepancy_value: string | number
  verified_claimable: string | number
  pending_recovery: string | number
  recovered_amount: string | number
  discrepancy_count: number
  active_claims: number
}

export interface MappingSaveRequest {
  upload_id: string
  mappings: Record<string, unknown>
  approved?: boolean
}

export interface MappingResponse {
  id: string
  upload_id: string
  version: number
  mappings: Record<string, unknown>
  is_approved: boolean
  created_at?: string
  updated_at?: string
}

export interface ReconRunCreate {
  name: string
  recon_type: string
  source_upload_id: string
  target_upload_id: string
}

export interface ReconRunResponse {
  id: string
  name: string
  recon_type: ReconType
  status: ReconRunStatus
  total_source: number
  total_target: number
  matched_count: number
  unmatched_count: number
  discrepancy_count: number
  total_expected: string | number
  total_received: string | number
  total_discrepancy: string | number
}

export interface ReconResultResponse {
  id: string
  run_id: string
  order_reference: string
  match_method: string
  match_status: MatchStatus
  stream_status: StreamStatus | null
  confidence_score: string | number
  expected_amount: string | number
  actual_amount: string | number
  difference: string | number
  explanation?: string | null
  details?: Record<string, unknown> | null
}

export interface DiscrepancyResponse {
  id: string
  run_id: string
  order_reference: string
  discrepancy_type: string
  severity: string
  status: DiscrepancyStatus
  expected_amount: string | number
  actual_amount: string | number
  difference_amount: string | number
  explanation: string | null
  partner?: string
  created_at?: string
}

export interface DiscrepancyUpdateRequest {
  status: DiscrepancyStatus
  resolution?: string
}

export interface ClaimResponse {
  id: string
  claim_reference: string
  discrepancy_id: string
  claim_type: string
  claim_amount: string | number
  recovered_amount: string | number
  status: ClaimStatus
  notes: string | null
  created_at: string
  partner?: string
  created_by?: string
}

export interface ClaimCreateRequest {
  discrepancy_id: string
  claim_type: string
  notes?: string
}

export interface ClaimUpdateRequest {
  status?: ClaimStatus
  recovered_amount?: string | number
  notes?: string
}

export interface PartnerResponse {
  id: string
  name: string
  code: string
  partner_type: string
  description: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AnalyticsDataPoint {
  name: string
  value: number
  [key: string]: string | number | boolean
}

export interface PaginationParams {
  page?: number
  page_size?: number
}
