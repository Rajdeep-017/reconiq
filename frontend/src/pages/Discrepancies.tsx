'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrencyINR } from '@/lib/utils'
import { useDiscrepancies, useUpdateDiscrepancy } from '@/hooks/useDiscrepancies'
import { Download } from 'lucide-react'

const DISCREPANCY_CATEGORIES = [
  'short_payment',
  'missing_settlement',
  'unpaid_order',
  'missing_cod_remittance',
  'freight_overcharge',
  'incorrect_freight_weight',
  'incorrect_freight_zone',
  'return_refund_mismatch',
  'duplicate_deduction',
]

const DISCREPANCY_STATUSES = ['detected', 'verified', 'disputed', 'resolved', 'dismissed']

const categoryLabels: Record<string, string> = {
  short_payment: 'Short Payment',
  missing_settlement: 'Missing Settlement',
  unpaid_order: 'Unpaid Order',
  missing_cod_remittance: 'Missing COD Remittance',
  freight_overcharge: 'Freight Overcharge',
  incorrect_freight_weight: 'Incorrect Freight Weight',
  incorrect_freight_zone: 'Incorrect Freight Zone',
  return_refund_mismatch: 'Return/Refund Mismatch',
  duplicate_deduction: 'Duplicate Deduction',
}

export function Discrepancies() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { data: discrepancies = [], isLoading, error } = useDiscrepancies({
    page: 1,
    page_size: 100,
  })
  const updateMutation = useUpdateDiscrepancy()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Discrepancies</h1>
            <p className="text-muted-foreground">
              Financial issues detected during reconciliation.
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
        <AlertTitle>Failed to load discrepancies</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    )
  }

  const filtered = discrepancies.filter((d: { order_reference: string; discrepancy_type: string; status: string }) => {
    if (search && !d.order_reference.toLowerCase().includes(search.toLowerCase()))
      return false
    if (categoryFilter && d.discrepancy_type !== categoryFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  })

  const totalDetected = discrepancies.reduce(
    (acc: number, d: { difference_amount: string | number }) => acc + Math.abs(Number(d.difference_amount || 0)),
    0
  )
  const verifiedClaimable = discrepancies
    .filter((d: { status: string }) => d.status === 'verified')
    .reduce((acc: number, d: { difference_amount: string | number }) => acc + Math.abs(Number(d.difference_amount || 0)), 0)
  const pendingReview = discrepancies.filter((d: { status: string }) => d.status === 'detected').length
  const resolvedAmount = discrepancies
    .filter((d: { status: string }) => d.status === 'resolved')
    .reduce((acc: number, d: { difference_amount: string | number }) => acc + Math.abs(Number(d.difference_amount || 0)), 0)

  const statusBadge = (s: string) => {
    switch (s) {
      case 'detected':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'verified':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'dismissed':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      case 'disputed':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const updateDiscrepancy = async (id: string, status: string) => {
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
          <h1 className="text-2xl font-bold">Discrepancies</h1>
          <p className="text-muted-foreground">
            Financial issues detected during reconciliation. Detected discrepancies are not recovered money.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Detected</CardTitle>
            <CardDescription>Total discrepancy amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyINR(totalDetected)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified Claimable</CardTitle>
            <CardDescription>Ready for claim submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyINR(verifiedClaimable)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Review</CardTitle>
            <CardDescription>Discrepancies awaiting action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resolved Amount</CardTitle>
            <CardDescription>Discrepancies resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyINR(resolvedAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Order reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as string)}
            >
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All categories" />
              </Select.Trigger>
              <Select.Content>
                {DISCREPANCY_CATEGORIES.map((cat) => (
                  <Select.Item key={cat} value={cat}>
                    {categoryLabels[cat] || cat}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All statuses" />
              </Select.Trigger>
              <Select.Content>
                {DISCREPANCY_STATUSES.map((s) => (
                  <Select.Item key={s} value={s}>{s}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_range">Date Range</Label>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All dates" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Detected Discrepancies</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              View Evidence
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discrepancy ID</TableHead>
                  <TableHead className="w-1/6">Order Reference</TableHead>
                  <TableHead className="w-1/6">Category</TableHead>
                  <TableHead className="w-1/6 text-right">Expected</TableHead>
                  <TableHead className="w-1/6 text-right">Actual</TableHead>
                  <TableHead className="w-1/6 text-right">Difference</TableHead>
                  <TableHead className="w-1/6">Detected</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No discrepancies found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filtered.map((d: { id: string; order_reference: string; discrepancy_type: string; status: string; expected_amount: string | number; actual_amount: string | number; difference_amount: string | number; created_at: string | null }) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm">{d.id}</TableCell>
                        <TableCell className="font-medium truncate-title" title={d.order_reference}>
                          {d.order_reference}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs truncate-title" title={categoryLabels[d.discrepancy_type] || d.discrepancy_type}>
                            {categoryLabels[d.discrepancy_type] || d.discrepancy_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right currency-cell">
                          {formatCurrencyINR(d.expected_amount)}
                        </TableCell>
                        <TableCell className="text-right currency-cell">
                          {formatCurrencyINR(d.actual_amount)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${Number(d.difference_amount) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrencyINR(d.difference_amount)}
                        </TableCell>
                        <TableCell className="text-xs">{d.created_at ? d.created_at.slice(0, 10) : '—'}</TableCell>
                        <TableCell>
                          <Badge className={statusBadge(d.status)}>{d.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDiscrepancy(d.id, 'verified')}
                              disabled={updateMutation.isPending}
                            >
                              Verify
                            </Button>
                            {d.status === 'detected' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateDiscrepancy(d.id, 'dismissed')}
                                disabled={updateMutation.isPending}
                              >
                                Dismiss
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {filtered.length} of {discrepancies.length} discrepancies
            </span>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>Important distinction</AlertTitle>
        <AlertDescription>
          Detected discrepancies represent potential recovery opportunities. They are not the same as recovered money.
          Only amounts in the "Verified Claimable" card should be treated as claimable, and only amounts marked "Resolved"
          represent actual recovery.
        </AlertDescription>
      </Alert>
    </div>
  )
}