import type { QueryClient } from '@tanstack/react-query'

/**
 * Root query keys whose data can change as a result of any write operation
 * (upload, mapping approval, run execution, discrepancy/claim updates).
 * Pages rely on these being invalidated after mutations so that tabs update
 * without a manual browser refresh.
 */
const FINANCIAL_KEYS = [
  'dashboard-metrics',
  'analytics',
  'reconciliation-runs',
  'reconciliation-run',
  'reconciliation-results',
  'discrepancies',
  'discrepancy',
  'claims',
  'uploads',
] as const

export const FINANCIAL_ROOT_KEYS = FINANCIAL_KEYS

/**
 * Invalidate every financial dataset after a mutation succeeds. Callers may
 * pass extra root keys (e.g. 'mappings') to also invalidate their own data.
 */
export function invalidateFinancialData(queryClient: QueryClient, extraKeys: string[] = []) {
  const roots = [...FINANCIAL_KEYS, ...extraKeys]
  for (const key of roots) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}
