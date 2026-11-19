'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrencyINR } from '@/lib/utils'
import { EmptyDataState } from '@/components/EmptyDataState'
import { useClaims, useCreateClaim, useUpdateClaim } from '@/hooks/useClaims'
import { useDiscrepancies } from '@/hooks/useDiscrepancies'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api'
import { Plus, RefreshCw, Loader2 } from 'lucide-react'

const CLAIM_STATUSES = [
  'draft',
  'submitted',
  'acknowledged',
  'under_review',
  'resolved',
  'rejected',
  'closed',
]

/** Next statuses the UI offers per current claim status. Resolved/closed are
 * restricted to finance cofounders by the backend; errors surface as toasts. */
const NEXT_STATUSES: Record<string, { value: string; label: string; cofounderOnly?: boolean }[]> = {
  draft: [{ value: 'submitted', label: 'Submit to partner' }],
  submitted: [
    { value: 'acknowledged', label: 'Mark acknowledged' },
    { value: 'under_review', label: 'Move to review' },
    { value: 'rejected', label: 'Reject' },
  ],
  acknowledged: [{ value: 'under_review', label: 'Move to review' }, { value: 'rejected', label: 'Reject' }],
  under_review: [
    { value: 'resolved', label: 'Resolve (recovered)', cofounderOnly: true },
    { value: 'rejected', label: 'Reject', cofounderOnly: false },
  ],
  resolved: [{ value: 'closed', label: 'Close', cofounderOnly: true }],
  rejected: [],
  closed: [],
}

const CLAIM_TYPE_OPTIONS = [
  { value: 'short_payment', label: 'Short Payment' },
  { value: 'missing_settlement', label: 'Missing Settlement' },
  { value: 'freight_overcharge', label: 'Freight Overcharge' },
  { value: 'duplicate_awb_billing', label: 'Duplicate AWB Billing' },
  { value: 'missing_cod_remittance', label: 'COD Remittance' },
  { value: 'return_not_received', label: 'Return Not Received' },
  { value: 'return_refund', label: 'Return/Refund' },
]

const claimTypeDefault = (discType: string | undefined): string => {
  switch (discType) {
    case 'short_paid':
    case 'short_payment':
      return 'short_payment'
    case 'missing_settlement':
      return 'missing_settlement'
    case 'missing_freight_invoice':
    case 'freight_overcharged':
    case 'freight_overcharge':
    case 'duplicate_awb_billing':
      return 'freight_overcharge'
    case 'missing_cod_remittance':
      return 'missing_cod_remittance'
    case 'return_not_received':
    case 'return_refund_mismatch':
      return 'return_not_received'
    default:
      return ''
  }
}

export function ClaimsManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [discrepancyId, setDiscrepancyId] = useState('')
  const [claimType, setClaimType] = useState('')
  const [claimNotes, setClaimNotes] = useState('')

  const { data: claims = [], isLoading, error, refetch } = useClaims({
    page: 1,
    page_size: 100,
  })
  const discrepanciesQuery = useDiscrepancies({ page: 1, page_size: 100 })
  const discrepancies = discrepanciesQuery.data ?? []
  const createMutation = useCreateClaim()
  const updateMutation = useUpdateClaim()

  const discrepancyOptions = useMemo(
    () =>
      discrepancies.map((d) => ({
        id: d.id,
        label: `${d.order_reference} · ${(d.discrepancy_type ?? '').replace(/_/g, ' ')} · ₹${Number(d.difference_amount).toLocaleString('en-IN')}`,
        type: d.discrepancy_type,
      })),
    [discrepancies]
  )

  const handleDiscrepancyPicked = (id: string) => {
    setDiscrepancyId(id)
    const picked = discrepancyOptions.find((o) => o.id === id)
    setClaimType(claimTypeDefault(picked?.type))
  }

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await createMutation.mutateAsync({
        discrepancy_id: discrepancyId,
        claim_type: claimType,
        notes: claimNotes || undefined,
      })
      setShowCreateDialog(false)
      setDiscrepancyId('')
      setClaimType('')
      setClaimNotes('')
      toast.success(`Claim ${created.claim_reference} created as draft (₹${Number(created.claim_amount).toLocaleString('en-IN')}).`)
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleUpdateClaim = async (
    id: string,
    status: string,
  ) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } })
      toast.success(`Claim marked as ${status.replace(/_/g, ' ')}.`)
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err))
    }
  }

  if (isLoading || discrepanciesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Claims Management</h1>
            <p className="text-muted-foreground">
              Generate, track, and manage recovery claims.
            </p>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error || discrepanciesQuery.error) {
    const queryError = error ?? discrepanciesQuery.error
    return (
      <Alert
        variant="destructive"
        onRetry={() => void Promise.all([refetch(), discrepanciesQuery.refetch()])}
        retryLabel="Retry"
      >
        <AlertTitle>Failed to load claims</AlertTitle>
        <AlertDescription>{extractErrorMessage(queryError)}</AlertDescription>
      </Alert>
    )
  }

  const filtered = claims.filter((c: { claim_reference: string; status: string }) => {
    if (
      search &&
      !c.claim_reference.toLowerCase().includes(search.toLowerCase())
    )
      return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  const totalClaims = claims.length
  const draftClaims = claims.filter((c: { status: string }) => c.status === 'draft').length
  const submittedClaims = claims.filter((c: { status: string }) => c.status === 'submitted').length
  const underReviewClaims = claims.filter((c: { status: string }) => c.status === 'under_review').length
  const approvedClaims = claims.filter((c: { status: string }) => c.status === 'resolved').length
  const rejectedClaims = claims.filter((c: { status: string }) => c.status === 'rejected').length
  const totalClaimed = claims.reduce(
    (acc: number, c: { claim_amount: string | number }) => acc + Number(c.claim_amount || 0),
    0
  )
  const totalRecovered = claims.reduce(
    (acc: number, c: { recovered_amount: string | number }) => acc + Number(c.recovered_amount || 0),
    0
  )

  const statusBadge = (s: string) => {
    switch (s) {
      case 'draft':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'acknowledged':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'under_review':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'closed':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Claims Management</h1>
          <p className="text-muted-foreground">
            Generate, track, and manage recovery claims with full lifecycle support.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Claim
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Claims</CardTitle>
            <CardDescription>All claims in system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Draft</CardTitle>
            <CardDescription>Not yet submitted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{draftClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Submitted</CardTitle>
            <CardDescription>Sent to partner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {submittedClaims}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Under Review</CardTitle>
            <CardDescription>Partner reviewing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {underReviewClaims}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved</CardTitle>
            <CardDescription>Partner agreed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedClaims}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rejected</CardTitle>
            <CardDescription>Partner rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedClaims}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Claimed</CardTitle>
            <CardDescription>Total claim amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrencyINR(totalClaimed)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Recovered</CardTitle>
            <CardDescription>Amount actually recovered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyINR(totalRecovered)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Claim ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All statuses" />
              </Select.Trigger>
              <Select.Content>
                {CLAIM_STATUSES.map((s) => (
                  <Select.Item key={s} value={s}>{s}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Claims</CardTitle>
          <span className="text-xs text-muted-foreground">
            Draft claims are auto-created by the engine for claimable discrepancies.
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead className="w-1/6">Discrepancy ID</TableHead>
                  <TableHead className="w-1/6">Claim Type</TableHead>
                  <TableHead className="w-1/6 text-right">Claim Amount</TableHead>
                  <TableHead className="w-1/6">Submission Date</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {claims.length === 0 ? (
                        <EmptyDataState
                          title="No claims yet"
                          description="Upload your reports and run a reconciliation to find claimable discrepancies."
                          actionLabel="Run reconciliation"
                          to="/reconciliation"
                        />
                      ) : (
                        'No claims found matching your filters.'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c: { id: string; claim_reference: string; discrepancy_id: string; claim_type: string; claim_amount: string | number; created_at: string | null; status: string }) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {c.claim_reference}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{c.discrepancy_id}</TableCell>
                      <TableCell className="text-xs capitalize">
                        {c.claim_type.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell className="text-right currency-cell font-medium">
                        {formatCurrencyINR(c.claim_amount)}
                      </TableCell>
                      <TableCell className="text-xs">{c.created_at ? c.created_at.slice(0, 10) : '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(c.status)}>
                          {c.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {updateMutation.isPending && updateMutation.variables?.id === c.id && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
                              <Loader2 className="h-3 w-3 animate-spin" /> Updating…
                            </span>
                          )}
                          {(NEXT_STATUSES[c.status] ?? []).some((n) => n.value === 'submitted') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleUpdateClaim(c.id, 'submitted')}
                              disabled={updateMutation.isPending}
                            >
                              Submit
                            </Button>
                          )}
                          <Select
                            value=""
                            onValueChange={(v) => v && void handleUpdateClaim(c.id, v)}
                            disabled={updateMutation.isPending || (NEXT_STATUSES[c.status] ?? []).length === 0}
                          >
                            <Select.Trigger className="w-[150px] h-8 text-xs">
                              <Select.Value placeholder={(NEXT_STATUSES[c.status] ?? []).length ? 'Change status…' : 'No actions'} />
                            </Select.Trigger>
                            <Select.Content>
                              {(NEXT_STATUSES[c.status] ?? []).map((n) => (
                                <Select.Item key={n.value} value={n.value}>
                                  {n.label}
                                  {n.cofounderOnly ? ' (cofounder)' : ''}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {filtered.length} of {claims.length} claims
            </span>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>Claim lifecycle</AlertTitle>
        <AlertDescription>
          Claims follow the lifecycle: Draft → Submitted → Acknowledged → Under Review →
          Resolved/Rejected → Closed. All transitions are enforced by the backend. AI does not
          approve or close claims automatically.
        </AlertDescription>
      </Alert>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} />
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Create Claim</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateClaim}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="create_claim_discrepancy_id">Discrepancy</Label>
                    <Select
                      value={discrepancyId}
                      onValueChange={handleDiscrepancyPicked}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder={discrepancyOptions.length ? 'Select discrepancy…' : 'No discrepancies yet'} />
                      </Select.Trigger>
                      <Select.Content>
                        {discrepancyOptions.length === 0 ? (
                          <Select.Item value="" disabled>
                            Execute a reconciliation run first
                          </Select.Item>
                        ) : (
                          discrepancyOptions.map((o) => (
                            <Select.Item key={o.id} value={o.id}>
                              {o.label}
                            </Select.Item>
                          ))
                        )}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create_claim_type">Claim Type</Label>
                    <Select
                      value={claimType}
                      onValueChange={(v) => setClaimType(v as string)}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder="Select claim type…" />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="" disabled className="text-muted-foreground">
                          Select claim type…
                        </Select.Item>
                        {CLAIM_TYPE_OPTIONS.map((t) => (
                          <Select.Item key={t.value} value={t.value}>
                            {t.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create_claim_notes">Notes</Label>
                    <Input
                      id="create_claim_notes"
                      placeholder="Optional notes"
                      value={claimNotes}
                      onChange={(e) => setClaimNotes(e.target.value)}
                    />
                  </div>
                </div>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending || !discrepancyId || !claimType}>
                    {createMutation.isPending ? 'Creating…' : 'Create Claim'}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
