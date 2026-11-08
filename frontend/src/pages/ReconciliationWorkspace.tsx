'use client'

import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  useReconciliationRuns,
  useCreateReconciliationRun,
} from '@/hooks/useReconciliation'
import { useUploads } from '@/hooks/useUploads'
import { formatCurrencyINR } from '@/lib/utils'
import { reconciliationService } from '@/services/reconciliation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { extractErrorMessage } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'orders', label: 'Orders' },
  { value: 'settlements', label: 'Settlements' },
  { value: 'freight', label: 'Freight' },
  { value: 'cod_remittances', label: 'COD Remittances' },
  { value: 'returns', label: 'Returns' },
]

export function ReconciliationWorkspace() {
  const [dateRange, setDateRange] = useState('30d')
  const [partnerFilter, setPartnerFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [confidenceFilter, setConfidenceFilter] = useState<string>('')


  const { data: runs, isLoading, error, refetch } = useReconciliationRuns(1)
  const createMutation = useCreateReconciliationRun()
  const { data: uploadsData, isLoading: uploadsLoading } = useUploads(1, 100)
  const uploads = uploadsData?.uploads || []

  const resultsQueries = useQueries({
    queries: (runs || []).map((run) => ({
      queryKey: ['reconciliation-results', run.id],
      queryFn: () => reconciliationService.getResults(run.id),
      enabled: !!run.id,
    })),
  })

  const allResults = resultsQueries
    .flatMap((q) => q.data || [])
    .slice(0, 10)

  const resultsLoading = resultsQueries.some((q) => q.isLoading)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [runName, setRunName] = useState('')
  const [reconType, setReconType] = useState('')
  const [sourceUploadId, setSourceUploadId] = useState('')
  const [targetUploadId, setTargetUploadId] = useState('')

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createMutation.mutateAsync({
        name: runName,
        recon_type: reconType,
        source_upload_id: sourceUploadId,
        target_upload_id: targetUploadId,
      })
      setShowCreateDialog(false)
      setRunName('')
      setReconType('')
      setSourceUploadId('')
      setTargetUploadId('')
      toast.success('Reconciliation run created')
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Failed to create reconciliation run.'
      toast.error(msg)
    }
  }

  if (isLoading || resultsLoading || uploadsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold">Reconciliation Workspace</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="h-32">
              <CardContent>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" onRetry={refetch} retryLabel="Retry">
        <AlertTitle>Failed to load reconciliation data</AlertTitle>
        <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
      </Alert>
    )
  }

  const totalRecords = runs?.reduce((acc, r) => acc + r.total_source + r.total_target, 0) || 0
  const matchedRecords = runs?.reduce((acc, r) => acc + r.matched_count, 0) || 0
  const unmatchedRecords = runs?.reduce((acc, r) => acc + r.unmatched_count, 0) || 0
  const totalExpected = runs?.reduce((acc, r) => acc + Number(String(r.total_expected || 0)), 0) || 0
  const totalReceived = runs?.reduce((acc, r) => acc + Number(String(r.total_received || 0)), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation Workspace</h1>
          <p className="text-muted-foreground">
            Reconcile orders against settlements, freight, COD remittances, and returns across partners.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Reconciliation Run
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Records</CardTitle>
            <CardDescription>Source + target transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Matched Records</CardTitle>
            <CardDescription>Successfully reconciled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{matchedRecords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unmatched Records</CardTitle>
            <CardDescription>Requires manual review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unmatchedRecords.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Difference</CardTitle>
            <CardDescription>Expected vs received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalExpected >= totalReceived ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyINR(totalExpected - totalReceived)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Partner</Label>
            <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All partners" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="amazon">Amazon</Select.Item>
                <Select.Item value="flipkart">Flipkart</Select.Item>
                <Select.Item value="myntra">Myntra</Select.Item>
                <Select.Item value="meesho">Meesho</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Select range…" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
                <Select.Item value="1y">Last year</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reconciliation Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Select status…" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="matched">Matched</Select.Item>
                <Select.Item value="unmatched">Unmatched</Select.Item>
                <Select.Item value="partial">Partial</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Match Confidence</Label>
            <Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Select confidence…" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="high">High (≥80%)</Select.Item>
                <Select.Item value="medium">Medium (50–79%)</Select.Item>
                <Select.Item value="low">Low (&lt;50%)</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Match Results</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="#">Export Results</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Reference</TableHead>
                  <TableHead className="w-1/6">Partner</TableHead>
                  <TableHead className="w-1/6 text-right">Order Value</TableHead>
                  <TableHead className="w-1/6 text-right">Expected</TableHead>
                  <TableHead className="w-1/6 text-right">Actual</TableHead>
                  <TableHead className="w-1/6 text-right">Difference</TableHead>
                  <TableHead className="w-1/6">Match Method</TableHead>
                  <TableHead className="w-1/6">Confidence</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                      No match results available. Run a reconciliation to see results.
                    </TableCell>
                  </TableRow>
                ) : (
                  allResults.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium truncate-title" title={row.order_reference}>
                        {row.order_reference}
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell className="text-right currency-cell">
                        {formatCurrencyINR(row.expected_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right currency-cell">
                        {formatCurrencyINR(row.actual_amount || 0)}
                      </TableCell>
                      <TableCell className="text-right currency-cell">
                        {formatCurrencyINR(Number(row.expected_amount || 0) - Number(row.actual_amount || 0))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{String(row.match_method || '-').replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            Number(row.confidence_score || 0) >= 0.8
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : Number(row.confidence_score || 0) >= 0.5
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {Math.round(Number(row.confidence_score || 0) * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.match_status === 'matched'
                              ? 'success'
                              : row.match_status === 'partial'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {String(row.match_status).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href="#">View</a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href="#">Review</a>
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
              Showing {allResults.length} records
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} />
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Create Reconciliation Run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCreateRun}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Run Name</Label>
                    <Input
                      placeholder="e.g. Dec Orders vs Settlements"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reconciliation Type</Label>
                    <Select value={reconType} onValueChange={(v) => setReconType(v as string)}>
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder="Select type…" />
                      </Select.Trigger>
                      <Select.Content>
                        {DOCUMENT_TYPES.map(dt => (
                          <Select.Item key={dt.value} value={`${dt.value}_settlement`}>
                            {dt.label} → Settlements
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source Upload</Label>
                      <Select value={sourceUploadId} onValueChange={(v) => setSourceUploadId(v as string)}>
                        <Select.Trigger className="w-full">
                          <Select.Value placeholder="Select source file…" />
                        </Select.Trigger>
                        <Select.Content>
                          {uploads.map((u) => (
                            <Select.Item key={u.id} value={u.id}>
                              {u.original_filename}
                            </Select.Item>
                          ))}
                          {uploads.length === 0 && (
                            <Select.Item value="" disabled>
                              No uploads available
                            </Select.Item>
                          )}
                        </Select.Content>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Upload</Label>
                      <Select value={targetUploadId} onValueChange={(v) => setTargetUploadId(v as string)}>
                        <Select.Trigger className="w-full">
                          <Select.Value placeholder="Select target file…" />
                        </Select.Trigger>
                        <Select.Content>
                          {uploads.map((u) => (
                            <Select.Item key={u.id} value={u.id}>
                              {u.original_filename}
                            </Select.Item>
                          ))}
                          {uploads.length === 0 && (
                            <Select.Item value="" disabled>
                              No uploads available
                            </Select.Item>
                          )}
                        </Select.Content>
                      </Select>
                    </div>
                  </div>
                </div>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating…' : 'Create Run'}
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
