'use client'

import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  useReconciliationRuns,
  useCreateReconciliationRun,
  useExecuteReconciliationRun,
} from '@/hooks/useReconciliation'
import { reconciliationService, type ReconResultResponse } from '@/services/reconciliation'
import { useUploads } from '@/hooks/useUploads'
import { EmptyDataState } from '@/components/EmptyDataState'
import { formatCurrencyINR, cn } from '@/lib/utils'
import { extractErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Play, RotateCcw, Plus, Loader2, Eye, RefreshCw, X } from 'lucide-react'

type StreamKey = 'settlement' | 'cod' | 'freight' | 'return'

const STREAMS: {
  key: StreamKey
  label: string
  sourceType: string
  targetType: string
  sourceLabel: string
  targetLabel: string
}[] = [
  { key: 'settlement', label: 'Settlements', sourceType: 'orders', targetType: 'settlements', sourceLabel: 'Orders', targetLabel: 'Settlements' },
  { key: 'cod', label: 'COD Remittances', sourceType: 'orders', targetType: 'cod_remittances', sourceLabel: 'Orders', targetLabel: 'COD Remittances' },
  { key: 'freight', label: 'Freight Invoices', sourceType: 'orders', targetType: 'freight_invoices', sourceLabel: 'Orders', targetLabel: 'Freight Invoices' },
  { key: 'return', label: 'Returns vs Warehouse Scans', sourceType: 'returns', targetType: 'warehouse_scans', sourceLabel: 'Returns', targetLabel: 'Warehouse Scans' },
]

/** Uploads that can drive an engine: mapping approved and data normalized (or still moving). */
const USABLE_UPLOAD_STATUSES = ['mapped', 'processing', 'processed']

// Radix Select forbids value=""; use a sentinel for the empty-state row.
const NO_UPLOAD_OPTION = '__no_upload__'

const runStatusBadge = (s: string) => {
  switch (s) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>
    case 'running':
      return <Badge variant="warning">Running</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="secondary">Created</Badge>
  }
}

const streamStatusBadge = (streamStatus: string | null | undefined) => {
  if (!streamStatus) return <Badge variant="secondary">{streamStatusLabel('')}</Badge>
  switch (streamStatus) {
    case 'settled':
      return <Badge variant="success">Settled</Badge>
    case 'short_paid':
      return <Badge variant="warning">Short Paid</Badge>
    case 'unpaid_past_due':
      return <Badge variant="destructive">Unpaid Past Due</Badge>
    case 'freight_overcharged':
      return <Badge variant="destructive">Freight Overcharged</Badge>
    case 'return_not_received':
      return <Badge variant="destructive">Return Not Received</Badge>
    case 'settled_late':
      return <Badge variant="warning">Settled Late</Badge>
    case 'not_yet_due':
      return <Badge variant="secondary">Not Yet Due</Badge>
    case 'missing_freight_invoice':
      return <Badge variant="warning">Missing Freight Invoice</Badge>
    default:
      return <Badge variant="secondary">{streamStatus}</Badge>
  }
}

function streamStatusLabel(streamStatus: string | null | undefined): string {
  if (!streamStatus) return 'No stream status'
  return streamStatus
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

const streamTypeLabel = (reconType: string) =>
  STREAMS.find((s) => s.key === reconType)?.label ?? reconType

export function ReconciliationWorkspace() {
  const [stream, setStream] = useState<StreamKey>('settlement')
  const [sourceUploadId, setSourceUploadId] = useState('')
  const [targetUploadId, setTargetUploadId] = useState('')
  const [runName, setRunName] = useState('')
  const [openResultRunId, setOpenResultRunId] = useState<string | null>(null)

  const runsQuery = useReconciliationRuns()
  const uploadsQuery = useUploads({ page: 1, pageSize: 100 })
  const createMutation = useCreateReconciliationRun()
  const executeMutation = useExecuteReconciliationRun()
  const runs = runsQuery.data ?? []
  const uploads = uploadsQuery.data?.uploads ?? []
  const activeStream = STREAMS.find((s) => s.key === stream)!

  const streamQueries = useQueries({
    queries: (openResultRunId ? [openResultRunId] : []).map((runId) => ({
      queryKey: ['reconciliation-results', runId],
      queryFn: () => reconciliationService.getResults(runId),
      enabled: !!runId,
    })),
  })
  const results = (streamQueries[0]?.data ?? []) as ReconResultResponse[]
  const resultsLoading = streamQueries[0]?.isLoading ?? false
  const resultsError = streamQueries[0]?.error
  const openRun = runs.find((r) => r.id === openResultRunId)

  const sourceOptions = useMemo(
    () =>
      uploads.filter(
        (u) => u.document_type === activeStream.sourceType && USABLE_UPLOAD_STATUSES.includes(u.status)
      ),
    [uploads, activeStream]
  )
  const targetOptions = useMemo(
    () =>
      uploads.filter(
        (u) => u.document_type === activeStream.targetType && USABLE_UPLOAD_STATUSES.includes(u.status)
      ),
    [uploads, activeStream]
  )

  const resetSelections = () => {
    setSourceUploadId('')
    setTargetUploadId('')
  }

  const canCreate = !!sourceUploadId && !!targetUploadId

  const handleCreateRun = async () => {
    if (!canCreate) return
    try {
      const created = await createMutation.mutateAsync({
        name: runName.trim() || `${activeStream.label} run`,
        recon_type: activeStream.key,
        source_upload_id: sourceUploadId,
        target_upload_id: targetUploadId,
      })
      setRunName('')
      toast.success(`Run "${created.name}" created. Execute it to compute results.`)
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleExecute = async (runId: string, alreadyCompleted = false) => {
    try {
      const done = await executeMutation.mutateAsync(runId)
      if (done.status === 'completed') {
        toast.success(
          alreadyCompleted
            ? `Re-run finished — results refreshed (${done.discrepancy_count} discrepancies).`
            : `Run completed — ${done.matched_count} matched, ${done.discrepancy_count} discrepancies.`
        )
      } else {
        toast.error(`Run failed: check the run's error details.`)
      }
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  if (runsQuery.isLoading || uploadsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reconciliation</h1>
          <p className="text-muted-foreground">Runs and results for all reconciliation streams.</p>
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (runsQuery.error || uploadsQuery.error) {
    const error = runsQuery.error ?? uploadsQuery.error
    return (
      <Alert
        variant="destructive"
        onRetry={() => void Promise.all([runsQuery.refetch(), uploadsQuery.refetch()])}
        retryLabel="Retry"
      >
        <AlertTitle>Failed to load reconciliation data</AlertTitle>
        <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation</h1>
        <p className="text-muted-foreground">
          Create a run for a stream, execute it, and review per-order results.
        </p>
      </div>

      {/* New run form */}
      <Card id="new-run">
        <CardHeader>
          <CardTitle>New Run</CardTitle>
          <CardDescription>
            Pick a stream and the two uploads to compare. Runs execute on demand — a created
            (not executed) run produces no results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="run-stream">Stream</Label>
              <Select value={stream} onValueChange={(v) => { setStream(v as StreamKey); resetSelections() }}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {STREAMS.map((s) => (
                    <Select.Item key={s.key} value={s.key}>
                      {s.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-source">{activeStream.sourceLabel} upload</Label>
              <Select value={sourceUploadId} onValueChange={(v) => setSourceUploadId(v)}>
                <Select.Trigger className="w-full">
                  <Select.Value placeholder={sourceOptions.length ? 'Select upload…' : 'No uploads yet'} />
                </Select.Trigger>
                <Select.Content>
                  {sourceOptions.length === 0 ? (
                    <Select.Item value={NO_UPLOAD_OPTION} disabled>
                      Upload a {activeStream.sourceType.replace('_', ' ')} file first
                    </Select.Item>
                  ) : (
                    sourceOptions.map((u) => (
                      <Select.Item key={u.id} value={u.id}>
                        {u.original_filename}
                      </Select.Item>
                    ))
                  )}
                </Select.Content>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-target">{activeStream.targetLabel} upload</Label>
              <Select value={targetUploadId} onValueChange={(v) => setTargetUploadId(v)}>
                <Select.Trigger className="w-full">
                  <Select.Value placeholder={targetOptions.length ? 'Select upload…' : 'No uploads yet'} />
                </Select.Trigger>
                <Select.Content>
                  {targetOptions.length === 0 ? (
                    <Select.Item value={NO_UPLOAD_OPTION} disabled>
                      Upload a {activeStream.targetType.replace('_', ' ')} file first
                    </Select.Item>
                  ) : (
                    targetOptions.map((u) => (
                      <Select.Item key={u.id} value={u.id}>
                        {u.original_filename}
                      </Select.Item>
                    ))
                  )}
                </Select.Content>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="run-name">Run name (optional)</Label>
              <Input
                id="run-name"
                placeholder={`${activeStream.label} — Nov 2026`}
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCreateRun}
              disabled={!canCreate || createMutation.isPending}
              className="flex items-center gap-2"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Runs table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Runs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runsQuery.refetch()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <EmptyDataState
              title="No reconciliation runs yet"
              description="Upload the files you want to compare, then create and execute a reconciliation run."
              actionLabel={uploads.length === 0 ? 'Upload a file' : 'Create a run'}
              to={uploads.length === 0 ? '/uploads' : '#new-run'}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Matched</TableHead>
                  <TableHead className="text-right">Discrepancies</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium truncate-title max-w-[220px]" title={run.name}>
                      {run.name}
                    </TableCell>
                    <TableCell>
                      {streamTypeLabel(run.recon_type)}
                    </TableCell>
                    <TableCell>{runStatusBadge(run.status)}</TableCell>
                    <TableCell className="text-right text-green-700">
                      {run.status === 'completed' ? run.matched_count.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right text-red-700">
                      {run.status === 'completed' ? run.discrepancy_count.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {run.status === 'completed' ? formatCurrencyINR(run.total_discrepancy) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(run.status === 'created' || run.status === 'running') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExecute(run.id)}
                            disabled={executeMutation.isPending}
                          >
                            {executeMutation.isPending && executeMutation.variables === run.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            Execute
                          </Button>
                        )}
                        {run.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOpenResultRunId(
                                openResultRunId === run.id ? null : run.id
                              )}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {openResultRunId === run.id ? 'Hide Results' : 'Results'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleExecute(run.id, true)}
                              disabled={executeMutation.isPending}
                              title="Re-executing replaces this run's previous results"
                            >
                              {executeMutation.isPending && executeMutation.variables === run.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <RotateCcw className="h-4 w-4 mr-1" />
                              )}
                              Re-run
                            </Button>
                          </>
                        )}
                        {run.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleExecute(run.id)}
                            disabled={executeMutation.isPending}
                          >
                            {executeMutation.isPending && executeMutation.variables === run.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-1" />
                            )}
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results of the selected run */}
      {openResultRunId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Results — {openRun?.name ?? 'Run'}</CardTitle>
              <CardDescription>
                Per-order engine verdicts. Counts: {results.length} rows.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpenResultRunId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {resultsLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : resultsError ? (
              <div className="p-6">
                <Alert variant="destructive" onRetry={() => void streamQueries[0]?.refetch()}>
                  <AlertTitle>Failed to load results</AlertTitle>
                  <AlertDescription>{extractErrorMessage(resultsError)}</AlertDescription>
                </Alert>
              </div>
            ) : results.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                This run has no results. Execute it first.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Reference</TableHead>
                    <TableHead>Stream Status</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead className="max-w-[320px]">Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium truncate-title max-w-[180px]" title={r.order_reference}>
                        {r.order_reference}
                      </TableCell>
                      <TableCell>{streamStatusBadge(r.stream_status)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {r.match_status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrencyINR(r.expected_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyINR(r.actual_amount)}</TableCell>
                      <TableCell className={cn(
                        'text-right font-medium',
                        Number(r.difference) === 0 ? 'text-green-700' : 'text-red-700'
                      )}>
                        {formatCurrencyINR(r.difference)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(r.confidence_score) >= 0 ? `${(Number(r.confidence_score) * 100).toFixed(0)}%` : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate-title max-w-[320px]" title={r.explanation ?? ''}>
                        {r.explanation ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Alert variant="info">
        <AlertTitle>How runs work</AlertTitle>
        <AlertDescription>
          Executing a run compares the two uploads and writes real results, discrepancies and draft
          claims. Re-executing a run is safe: its previous results are replaced (older runs are kept).
        </AlertDescription>
      </Alert>
    </div>
  )
}
