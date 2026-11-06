'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrencyINR } from '@/lib/utils'
import { Download, Plus } from 'lucide-react'
const CLAIM_STATUSES = ['draft', 'submitted', 'acknowledged', 'under_review', 'resolved', 'rejected', 'closed']

const CLAIMS_DATA = [
  {
    id: 'CLM-A1B2C3D4',
    partner: 'Amazon',
    order_ref: 'ORD-2024-1128',
    discrepancy_type: 'short_payment',
    claim_amount: 3200.00,
    recovered_amount: 0,
    status: 'submitted' as const,
    submitted_date: '14 Dec 2024',
    reviewer: 'Sarah J.',
  },
  {
    id: 'CLM-E5F6G7H8',
    partner: 'Flipkart',
    order_ref: 'ORD-2024-1135',
    discrepancy_type: 'missing_settlement',
    claim_amount: 1850.00,
    recovered_amount: 0,
    status: 'under_review' as const,
    submitted_date: '13 Dec 2024',
    reviewer: 'Mike R.',
  },
  {
    id: 'CLM-I9J0K1L2',
    partner: 'Myntra',
    order_ref: 'ORD-2024-1142',
    discrepancy_type: 'freight_overcharge',
    claim_amount: 450.00,
    recovered_amount: 300.00,
    status: 'resolved' as const,
    submitted_date: '10 Dec 2024',
    reviewer: 'Sarah J.',
  },
  {
    id: 'CLM-M3N4O5P6',
    partner: 'Meesho',
    order_ref: 'ORD-2024-1150',
    discrepancy_type: 'missing_cod_remittance',
    claim_amount: 899.00,
    recovered_amount: 0,
    status: 'draft' as const,
    submitted_date: '—',
    reviewer: '—',
  },
  {
    id: 'CLM-Q7R8S9T0',
    partner: 'Amazon',
    order_ref: 'ORD-2024-1158',
    discrepancy_type: 'duplicate_deduction',
    claim_amount: 450.00,
    recovered_amount: 0,
    status: 'rejected' as const,
    submitted_date: '08 Dec 2024',
    reviewer: 'Mike R.',
  },
]

export function ClaimsManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')

  const totalClaims = CLAIMS_DATA.length
  const draftClaims = CLAIMS_DATA.filter(c => c.status === 'draft').length
  const submittedClaims = CLAIMS_DATA.filter(c => c.status === 'submitted').length
  const underReviewClaims = CLAIMS_DATA.filter(c => c.status === 'under_review').length
  const approvedClaims = CLAIMS_DATA.filter(c => c.status === 'resolved').length
  const rejectedClaims = CLAIMS_DATA.filter(c => c.status === 'rejected').length
  const totalClaimed = CLAIMS_DATA.reduce((acc, c) => acc + c.claim_amount, 0)
  const totalRecovered = CLAIMS_DATA.reduce((acc, c) => acc + c.recovered_amount, 0)

  const statusBadge = (s: string) => {
    switch (s) {
      case 'draft': return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'acknowledged': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'under_review': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'closed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const filtered = CLAIMS_DATA.filter(c => {
    if (search && !c.id.toLowerCase().includes(search.toLowerCase()) && !c.order_ref.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter && c.status !== statusFilter) return false
    if (partnerFilter && c.partner !== partnerFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
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
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Create Claim
          </Button>
        </div>
      </div>

      {/* Summary cards */}
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
            <div className="text-2xl font-bold text-blue-600">{submittedClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Under Review</CardTitle>
            <CardDescription>Partner reviewing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{underReviewClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved</CardTitle>
            <CardDescription>Partner agreed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rejected</CardTitle>
            <CardDescription>Partner rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedClaims}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Claimed</CardTitle>
            <CardDescription>Total claim amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrencyINR(totalClaimed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Recovered</CardTitle>
            <CardDescription>Amount actually recovered</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyINR(totalRecovered)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Claim ID, order reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All statuses" />
              </Select.Trigger>
              <Select.Content>
                {CLAIM_STATUSES.map(s => <Select.Item key={s} value={s}>{s}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Partner</Label>
            <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All partners" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="Amazon">Amazon</Select.Item>
                <Select.Item value="Flipkart">Flipkart</Select.Item>
                <Select.Item value="Myntra">Myntra</Select.Item>
                <Select.Item value="Meesho">Meesho</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims table */}
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
                  <TableHead className="w-1/6">Partner</TableHead>
                  <TableHead className="w-1/6">Order Reference</TableHead>
                  <TableHead className="w-1/6">Discrepancy Type</TableHead>
                  <TableHead className="w-1/6 text-right">Claim Amount</TableHead>
                  <TableHead className="w-1/6">Submission Date</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Reviewer</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No claims found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm font-medium">{c.id}</TableCell>
                      <TableCell>{c.partner}</TableCell>
                      <TableCell className="font-medium truncate-title" title={c.order_ref}>{c.order_ref}</TableCell>
                      <TableCell className="text-xs capitalize">{c.discrepancy_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-right currency-cell font-medium">{formatCurrencyINR(c.claim_amount)}</TableCell>
                      <TableCell className="text-xs">{c.submitted_date}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(c.status)}>{c.status.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{c.reviewer}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href="#">Details</a>
                          </Button>
                          {c.status === 'draft' && (
                            <Button variant="outline" size="sm" asChild>
                              <a href="#">Edit</a>
                            </Button>
                          )}
                          {c.status === 'draft' && (
                            <Button size="sm" onClick={() => {}}>
                              Submit
                            </Button>
                          )}
                          {(String(c.status) === 'resolved' || String(c.status) === 'closed') && (
                            <Button variant="outline" size="sm" asChild>
                              <a href="#">View</a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Showing {filtered.length} of {CLAIMS_DATA.length} claims</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>Claim lifecycle</AlertTitle>
        <AlertDescription>
          Claims follow the lifecycle: Draft → Submitted → Acknowledged → Under Review → Resolved/Rejected → Closed. All transitions are enforced by the backend. AI does not approve or close claims automatically.
        </AlertDescription>
      </Alert>
    </div>
  )
}
