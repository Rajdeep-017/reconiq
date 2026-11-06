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

const DISCREPANCY_STATUSES = ['open', 'verified', 'resolved', 'dismissed']

export function Discrepancies() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Dev fixtures — clearly marked
  const DISCREPANCIES_DATA = [
    {
      id: 'DSC-2024-001',
      order_ref: 'ORD-2024-1128',
      partner: 'Amazon',
      category: 'short_payment',
      categoryLabel: 'Short Payment',
      expected: 2499.00,
      actual: 2399.00,
      difference: 100.00,
      date: '16 Dec 2024',
      status: 'open' as const,
      severity: 'high',
    },
    {
      id: 'DSC-2024-002',
      order_ref: 'ORD-2024-1135',
      partner: 'Flipkart',
      category: 'missing_settlement',
      categoryLabel: 'Missing Settlement',
      expected: 1850.00,
      actual: 0,
      difference: 1850.00,
      date: '15 Dec 2024',
      status: 'open' as const,
      severity: 'critical',
    },
    {
      id: 'DSC-2024-003',
      order_ref: 'ORD-2024-1142',
      partner: 'Myntra',
      category: 'freight_overcharge',
      categoryLabel: 'Freight Overcharge',
      expected: 150.00,
      actual: 220.00,
      difference: -70.00,
      date: '14 Dec 2024',
      status: 'verified' as const,
      severity: 'medium',
    },
    {
      id: 'DSC-2024-004',
      order_ref: 'ORD-2024-1150',
      partner: 'Meesho',
      category: 'missing_cod_remittance',
      categoryLabel: 'Missing COD Remittance',
      expected: 899.00,
      actual: 0,
      difference: 899.00,
      date: '13 Dec 2024',
      status: 'open' as const,
      severity: 'high',
    },
    {
      id: 'DSC-2024-005',
      order_ref: 'ORD-2024-1158',
      partner: 'Amazon',
      category: 'duplicate_deduction',
      categoryLabel: 'Duplicate Deduction',
      expected: 0,
      actual: -450.00,
      difference: 450.00,
      date: '12 Dec 2024',
      status: 'dismissed' as const,
      severity: 'low',
    },
    {
      id: 'DSC-2024-006',
      order_ref: 'ORD-2024-1165',
      partner: 'Flipkart',
      category: 'return_refund_mismatch',
      categoryLabel: 'Return/Refund Mismatch',
      expected: 1200.00,
      actual: 950.00,
      difference: 250.00,
      date: '11 Dec 2024',
      status: 'verified' as const,
      severity: 'medium',
    },
    {
      id: 'DSC-2024-007',
      order_ref: 'ORD-2024-1172',
      partner: 'Myntra',
      category: 'incorrect_freight_weight',
      categoryLabel: 'Incorrect Freight Weight',
      expected: 200.00,
      actual: 280.00,
      difference: -80.00,
      date: '10 Dec 2024',
      status: 'open' as const,
      severity: 'low',
    },
    {
      id: 'DSC-2024-008',
      order_ref: 'ORD-2024-1180',
      partner: 'Amazon',
      category: 'unpaid_order',
      categoryLabel: 'Unpaid Order',
      expected: 3400.00,
      actual: 0,
      difference: 3400.00,
      date: '09 Dec 2024',
      status: 'open' as const,
      severity: 'critical',
    },
  ]

  const totalDetected = DISCREPANCIES_DATA.reduce((acc, d) => acc + Math.abs(d.difference), 0)
  const verifiedClaimable = DISCREPANCIES_DATA
    .filter(d => d.status === 'verified')
    .reduce((acc, d) => acc + Math.abs(d.difference), 0)
  const pendingReview = DISCREPANCIES_DATA.filter(d => d.status === 'open').length
  const resolvedAmount = DISCREPANCIES_DATA
    .filter((d) => String(d.status) === 'resolved')
    .reduce((acc, d) => acc + Math.abs(Number(d.difference)), 0)

  const filtered = DISCREPANCIES_DATA.filter(d => {
    if (search && !d.order_ref.toLowerCase().includes(search.toLowerCase()) && !d.partner.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && d.category !== categoryFilter) return false
    if (partnerFilter && d.partner !== partnerFilter) return false
    if (statusFilter && d.status !== statusFilter) return false
    return true
  })

  const statusBadge = (s: string) => {
    switch (s) {
      case 'open': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'verified': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      case 'dismissed': return 'bg-slate-100 text-slate-800 border-slate-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
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

      {/* Top summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Detected</CardTitle>
            <CardDescription>Total discrepancy amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrencyINR(totalDetected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verified Claimable</CardTitle>
            <CardDescription>Ready for claim submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrencyINR(verifiedClaimable)}</div>
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
            <div className="text-2xl font-bold text-green-600">{formatCurrencyINR(resolvedAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Order reference, partner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All categories" />
              </Select.Trigger>
              <Select.Content>
                {DISCREPANCY_CATEGORIES.map(cat => {
                  const item = DISCREPANCIES_DATA.find(d => d.category === cat)
                  return <Select.Item key={cat} value={cat}>{item?.categoryLabel || cat}</Select.Item>
                })}
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
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All statuses" />
              </Select.Trigger>
              <Select.Content>
                {DISCREPANCY_STATUSES.map(s => <Select.Item key={s} value={s}>{s}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
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
          <div className="space-y-2">
            <Label>Amount Range</Label>
            <Select value="">
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Any amount" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="0-1000">₹0 – ₹1,000</Select.Item>
                <Select.Item value="1000-5000">₹1,000 – ₹5,000</Select.Item>
                <Select.Item value="5000-10000">₹5,000 – ₹10,000</Select.Item>
                <Select.Item value="10000+">₹10,000+</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Discrepancies table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Detected Discrepancies</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              View Evidence
            </Button>
            <Button variant="outline" size="sm" disabled>
              Mark Resolved
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
                  <TableHead className="w-1/6">Partner</TableHead>
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
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                      No discrepancies found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm">{d.id}</TableCell>
                      <TableCell className="font-medium truncate-title" title={d.order_ref}>{d.order_ref}</TableCell>
                      <TableCell>{d.partner}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs truncate-title" title={d.categoryLabel}>
                          {d.categoryLabel}
                        </Badge>
                        <Badge variant={d.severity === 'critical' ? 'destructive' : d.severity === 'high' ? 'warning' : 'secondary'} className="ml-1 text-xs">
                          {d.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right currency-cell">{formatCurrencyINR(d.expected)}</TableCell>
                      <TableCell className="text-right currency-cell">{formatCurrencyINR(d.actual)}</TableCell>
                      <TableCell className={`text-right font-medium ${d.difference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrencyINR(d.difference)}
                      </TableCell>
                      <TableCell className="text-xs">{d.date}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(d.status)}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild onClick={() => {}}>
                            <a href="#">View</a>
                          </Button>
                          <Button variant="outline" size="sm" asChild onClick={() => {}}>
                            <a href="#">Evidence</a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {}}>
                            Claim
                          </Button>
                          {d.status === 'open' && (
                            <Button variant="destructive" size="sm" onClick={() => {}}>
                              Resolve
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
            <span className="text-sm text-muted-foreground">Showing {filtered.length} of {DISCREPANCIES_DATA.length} discrepancies</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertTitle>Important distinction</AlertTitle>
        <AlertDescription>
          Detected discrepancies represent potential recovery opportunities. They are not the same as recovered money. Only amounts in the "Verified Claimable" card should be treated as claimable, and only amounts marked "Resolved" represent actual recovery.
        </AlertDescription>
      </Alert>
    </div>
  )
}
