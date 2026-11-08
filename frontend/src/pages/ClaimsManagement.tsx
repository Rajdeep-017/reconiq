'use client'

import { useState } from 'react'
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
import { Download, Plus } from 'lucide-react'
import { useClaims, useCreateClaim, useUpdateClaim } from '@/hooks/useClaims'

const CLAIM_STATUSES = [
  'draft',
  'submitted',
  'acknowledged',
  'under_review',
  'resolved',
  'rejected',
  'closed',
]

export function ClaimsManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [discrepancyId, setDiscrepancyId] = useState('')
  const [claimType, setClaimType] = useState('')
  const [claimNotes, setClaimNotes] = useState('')

  const { data: claims = [], isLoading, error } = useClaims({
    page: 1,
    page_size: 100,
  })
  const createMutation = useCreateClaim()
  const updateMutation = useUpdateClaim()

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        discrepancy_id: discrepancyId,
        claim_type: claimType,
        notes: claimNotes || undefined,
      })
      setShowCreateDialog(false)
      setDiscrepancyId('')
      setClaimType('')
      setClaimNotes('')
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to create claim.'
      alert(msg)
    }
  }

  if (isLoading) {
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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load claims</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
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

  const handleUpdateClaim = async (
    id: string,
    status: string,
  ) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } })
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Update failed'
      alert(msg)
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export Evidence
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Create Claim
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              View History
            </Button>
          </div>
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
                      No claims found matching your filters.
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
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateClaim(c.id, 'submitted')}
                            disabled={c.status !== 'draft' || updateMutation.isPending}
                          >
                            Submit
                          </Button>
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
                    <Label htmlFor="create_claim_discrepancy_id">Discrepancy ID</Label>
                    <Input
                      id="create_claim_discrepancy_id"
                      placeholder="e.g. DSC-2024-001"
                      value={discrepancyId}
                      onChange={(e) => setDiscrepancyId(e.target.value)}
                    />
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
                        <Select.Item value="short_payment">Short Payment</Select.Item>
                        <Select.Item value="missing_settlement">Missing Settlement</Select.Item>
                        <Select.Item value="freight_overcharge">Freight Overcharge</Select.Item>
                        <Select.Item value="cod_remittance">COD Remittance</Select.Item>
                        <Select.Item value="return_refund">Return/Refund</Select.Item>
                        <Select.Item value="duplicate_deduction">Duplicate Deduction</Select.Item>
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
