'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSuggestMapping, useGetMapping, useSaveMapping } from '@/hooks/useMappings'
import { useUpload } from '@/hooks/useUploads'
import { cn } from '@/lib/utils'
import { extractErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

/** Canonical target vocabulary per document type — mirrors the backend
 * mapping aliases + normalization service. `required: true` fields must be
 * mapped before processing (backend requires `order_reference` for every type). */
const CANONICAL_FIELDS_BY_TYPE: Record<string, { key: string; label: string; required?: boolean }[]> = {
  orders: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'order_date', label: 'Order Date' },
    { key: 'channel', label: 'Channel' },
    { key: 'partner', label: 'Partner' },
    { key: 'sku', label: 'SKU' },
    { key: 'product_name', label: 'Product Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'gross_amount', label: 'Gross Amount' },
    { key: 'discount', label: 'Discount' },
    { key: 'net_amount', label: 'Net Amount' },
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'customer_city', label: 'Customer City' },
    { key: 'customer_state', label: 'Customer State' },
    { key: 'status', label: 'Order Status' },
  ],
  settlements: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'settlement_reference', label: 'Settlement Reference' },
    { key: 'settlement_date', label: 'Settlement Date' },
    { key: 'transaction_type', label: 'Transaction Type' },
    { key: 'actual_received', label: 'Settled Amount' },
    { key: 'commission', label: 'Commission' },
    { key: 'shipping_fee', label: 'Shipping Fee' },
    { key: 'tcs_deducted', label: 'TCS Deducted' },
    { key: 'tds_deducted', label: 'TDS Deducted' },
    { key: 'other_fees', label: 'Other Fees' },
  ],
  cod_remittances: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'cod_amount', label: 'COD Amount' },
    { key: 'remitted_amount', label: 'Remitted Amount' },
    { key: 'utr_number', label: 'UTR Number' },
    { key: 'remittance_date', label: 'Remittance Date' },
    { key: 'remittance_reference', label: 'Remittance Reference' },
  ],
  freight_invoices: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'invoice_reference', label: 'Invoice Reference' },
    { key: 'invoice_date', label: 'Invoice Date' },
    { key: 'courier_partner', label: 'Courier Partner' },
    { key: 'awb_number', label: 'AWB Number' },
    { key: 'origin_pincode', label: 'Origin Pincode' },
    { key: 'destination_pincode', label: 'Destination Pincode' },
    { key: 'charged_weight_kg', label: 'Charged Weight (kg)' },
    { key: 'actual_weight_kg', label: 'Actual Weight (kg)' },
    { key: 'zone', label: 'Zone' },
    { key: 'rate_per_kg', label: 'Rate per kg' },
    { key: 'freight_amount', label: 'Freight Amount' },
    { key: 'cod_charges', label: 'COD Charges' },
    { key: 'total_freight', label: 'Total Freight' },
  ],
  returns: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'return_id_reference', label: 'Return Reference' },
    { key: 'return_date', label: 'Return Date' },
    { key: 'return_reason', label: 'Return Reason' },
    { key: 'return_status', label: 'Return Status' },
    { key: 'refund_amount', label: 'Refund Amount' },
    { key: 'refund_status', label: 'Refund Status' },
    { key: 'refund_date', label: 'Refund Date' },
  ],
  warehouse_scans: [
    { key: 'order_reference', label: 'Order Reference', required: true },
    { key: 'scan_reference', label: 'Scan Reference' },
    { key: 'scan_date', label: 'Scan Date' },
    { key: 'scan_type', label: 'Scan Type' },
    { key: 'location', label: 'Location' },
  ],
}

interface MappingField {
  source_column: string
  sample_values: string[]
  mapped_target: string | null
  confidence: number
  status: 'pending' | 'approved'
}

function inferType(values: string[]): string {
  if (values.length === 0) return 'string'
  const stripped = values.map((v) => String(v).trim()).filter((v) => v !== '')
  if (stripped.every((v) => /^-?₹?\s?[\d,]+(\.\d+)?$/.test(v))) return 'number'
  if (stripped.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[/ -]\d{1,2}[/ -]\d{2,4}$/.test(v))) return 'date'
  return 'string'
}

export function MappingReview() {
  const { upload_id } = useParams<{ upload_id: string }>()
  const navigate = useNavigate()

  const [mappings, setMappings] = useState<MappingField[]>([])
  const [initialized, setInitialized] = useState(false)

  const suggestQuery = useSuggestMapping(upload_id || '')
  const getMappingQuery = useGetMapping(upload_id || '')
  const uploadQuery = useUpload(upload_id || '')

  const upload = uploadQuery.data
  const documentType = upload?.document_type ?? ''
  const canonicalFields = useMemo(
    () => CANONICAL_FIELDS_BY_TYPE[documentType] ?? [],
    [documentType]
  )

  const isLoading =
    suggestQuery.isLoading || getMappingQuery.isLoading || uploadQuery.isLoading

  const suggestError = suggestQuery.error ?? getMappingQuery.error

  // Initialize mapping rows from the suggestion engine (and any saved mapping).
  useEffect(() => {
    if (!suggestQuery.data || !documentType || canonicalFields.length === 0) return
    if (initialized) return

    interface Suggestion {
      target_field: string | null
      confidence: number
      sample_values?: string[]
    }
    const suggestions = (suggestQuery.data as { mappings?: Record<string, Suggestion> }).mappings ?? {}

    const rows: MappingField[] = []
    for (const [sourceCol, sug] of Object.entries(suggestions)) {
      rows.push({
        source_column: sourceCol,
        sample_values: sug.sample_values ?? [],
        mapped_target: sug.target_field,
        confidence: sug.confidence ?? 0,
        status: 'pending',
      })
    }
    // Order: mapped rows with a defined canonical position first, extras after.
    rows.sort((a, b) => {
      const ai = canonicalFields.findIndex((f) => f.key === a.mapped_target)
      const bi = canonicalFields.findIndex((f) => f.key === b.mapped_target)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
    setMappings(rows)
    setInitialized(true)
  }, [suggestQuery.data, documentType, canonicalFields, initialized])

  const updateTarget = useCallback((sourceColumn: string, targetKey: string | null) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.source_column === sourceColumn
          ? { ...m, mapped_target: targetKey, status: 'pending' }
          : m
      )
    )
  }, [])

  const toggleApprove = useCallback((sourceColumn: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.source_column === sourceColumn
          ? { ...m, status: m.status === 'approved' ? 'pending' : 'approved' }
          : m
      )
    )
  }, [])

  const warnings = useMemo(() => {
    const list: string[] = []
    const mappedTargets = mappings
      .filter((m) => m.mapped_target)
      .map((m) => m.mapped_target as string)
    const duplicateTargets = mappedTargets.filter(
      (t, i) => mappedTargets.indexOf(t) !== i
    )
    if (duplicateTargets.length > 0) {
      list.push(`The same canonical field is mapped from multiple columns: ${[...new Set(duplicateTargets)].join(', ')}`)
    }
    return list
  }, [mappings])

  const requiredMissing = useMemo(
    () =>
      canonicalFields.filter(
        (f) => f.required && !mappings.some((m) => m.mapped_target === f.key)
      ),
    [canonicalFields, mappings]
  )

  const canApprove = mappings.some((m) => m.mapped_target && m.status === 'approved') && requiredMissing.length === 0

  const saveMutation = useSaveMapping()

  const buildMappingObject = () => {
    const approvedMappings = mappings.filter((m) => m.mapped_target)
    const obj: Record<string, string> = {}
    for (const m of approvedMappings) {
      if (m.mapped_target) obj[m.source_column] = m.mapped_target
    }
    return obj
  }

  const handleSaveDraft = async () => {
    if (!upload_id) return
    try {
      await saveMutation.mutateAsync({
        upload_id,
        mappings: buildMappingObject(),
        approved: false,
      })
      toast.success('Draft mapping saved. Nothing has been processed yet.')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleApproveAndProcess = async () => {
    if (!upload_id) return
    if (requiredMissing.length > 0) {
      toast.error(
        `Map the required field(s) first: ${requiredMissing.map((f) => f.label).join(', ')}`
      )
      return
    }
    try {
      // Approval triggers deterministic normalization + processing server-side
      // before the request returns; the uploads list will reflect the result.
      await saveMutation.mutateAsync({
        upload_id,
        mappings: buildMappingObject(),
        approved: true,
      })
      toast.success('Mappings approved. Normalization and processing ran server-side — check the uploads list for the final status.')
      navigate('/uploads')
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  if (suggestError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive" onRetry={() => {
          void suggestQuery.refetch()
          void getMappingQuery.refetch()
        }}>
          <AlertTitle>Failed to load mapping data</AlertTitle>
          <AlertDescription>{extractErrorMessage(suggestError)}</AlertDescription>
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/uploads">Back to uploads</Link>
        </Button>
      </div>
    )
  }
  if (isLoading || !upload || canonicalFields.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        <Card className="col-span-2">
          <CardHeader><CardTitle>Loading source columns…</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="flex-1 h-4 w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusChip = (() => {
    switch (upload.status) {
      case 'uploaded':
        return <Badge variant="secondary">Parsed: awaiting mapping</Badge>
      case 'parsed':
        return <Badge variant="secondary">Parsed: awaiting mapping</Badge>
      case 'mapped':
        return <Badge variant="warning">Mapped: awaiting approval/processing</Badge>
      case 'processing':
        return <Badge variant="warning">Processing…</Badge>
      case 'processed':
        return <Badge variant="success">Processed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{upload.status}</Badge>
    }
  })()

  const mappedCount = mappings.filter((m) => m.mapped_target).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Column Mapping Review</h1>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{upload.original_filename}</span>
            {' · '}
            {documentType.replace(/_/g, ' ')} · {upload.row_count ?? 0} rows detected
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusChip}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setInitialized(false)
              void suggestQuery.refetch()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Re-suggest
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSaveDraft()}
            disabled={mappedCount === 0 || saveMutation.isPending}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => void handleApproveAndProcess()}
            disabled={!canApprove || saveMutation.isPending}
            className="flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Approve &amp; Process <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
          </Button>
        </div>
      </div>

      {upload.status === 'failed' && upload.error_message && (
        <Alert variant="destructive">
          <AlertTitle>Processing failed on this upload</AlertTitle>
          <AlertDescription>{upload.error_message}</AlertDescription>
        </Alert>
      )}

      {upload.status === 'processed' && (
        <Alert variant="info">
          <AlertTitle>Already processed</AlertTitle>
          <AlertDescription>
            This upload was normalized earlier ({upload.processed_count} rows processed,{' '}
            {upload.rejected_count} rejected). Approving mappings here will still re-process from
            scratch; execution happens server-side immediately.
          </AlertDescription>
        </Alert>
      )}

      {requiredMissing.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Required field not mapped</AlertTitle>
          <AlertDescription>
            Map a source column to <strong>{requiredMissing.map((f) => f.label).join(', ')}</strong>{' '}
            before approving — the engine needs it to match records.
          </AlertDescription>
        </Alert>
      )}

      {warnings.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Mapping warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-1 text-sm">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: source columns */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Source Columns</CardTitle>
            <CardDescription>Columns detected in your uploaded file</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Column</TableHead>
                    <TableHead className="w-1/3">Sample Values</TableHead>
                    <TableHead className="w-1/6">Inferred Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.source_column}>
                      <TableCell className="font-medium truncate-title" title={m.source_column}>
                        {m.source_column}
                      </TableCell>
                      <TableCell
                        className="text-xs text-muted-foreground truncate-title"
                        title={m.sample_values.join(', ')}
                      >
                        {m.sample_values.slice(0, 3).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-xs">
                          {inferType(m.sample_values)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: target assignments */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Target Field Mapping</CardTitle>
            <CardDescription>
              Suggested targets for this document type are advisory — approve each mapping you want
              applied, then Approve &amp; Process.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px] space-y-3">
              {mappings.map((m) => {
                const canonical = canonicalFields.find((f) => f.key === m.mapped_target)
                const suggested = m.confidence > 0
                return (
                  <Card key={m.source_column} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="text-sm font-medium text-foreground truncate-title max-w-[240px]"
                          title={m.source_column}
                        >
                          {m.source_column}
                        </span>
                        {m.status === 'approved' && (
                          <Badge variant="success" className="h-6 px-2 text-xs shrink-0">Approved</Badge>
                        )}
                        {m.mapped_target && (
                          <Badge variant="secondary" className="h-6 px-2 text-xs shrink-0">
                            {canonical?.label ?? m.mapped_target}
                          </Badge>
                        )}
                        {suggested && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              'h-6 px-2 text-xs shrink-0 border',
                              m.confidence >= 0.8
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                            title="Rule-based suggestion confidence"
                          >
                            {Math.round(m.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-muted/50 rounded border border-border/50">
                      <p className="text-xs text-muted-foreground truncate-title" title={m.sample_values.join(', ')}>
                        {m.sample_values.slice(0, 3).join(', ') || 'No sample values'}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      <Button
                        variant={m.status === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleApprove(m.source_column)}
                        disabled={!m.mapped_target}
                      >
                        {m.status === 'approved' ? 'Approved ✓' : 'Approve'}
                      </Button>
                      <Select
                        value={m.mapped_target ?? ''}
                        onValueChange={(val) => updateTarget(m.source_column, val || null)}
                      >
                        <Select.Trigger className="w-[230px] h-8 text-xs">
                          <Select.Value placeholder="Unmapped — select target…" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="" className="text-muted-foreground">
                            Unmapped
                          </Select.Item>
                          {canonicalFields.map((f) => (
                            <Select.Item key={f.key} value={f.key}>
                              {f.label}
                              {f.required ? ' *' : ''}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  </Card>
                )
              })}
              {mappings.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  No source columns were detected for this file.
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-transparent pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {mappedCount} of {mappings.length} columns mapped ·{' '}
                {mappings.filter((m) => m.status === 'approved').length} approved
              </span>
              <span className="text-xs text-muted-foreground">* required field</span>
            </div>
          </CardFooter>
        </Card>
      </div>

      <Alert variant="info">
        <AlertTitle>What happens on Approve &amp; Process</AlertTitle>
        <AlertDescription>
          The approved mapping is saved as a new version, rows are normalized with deterministic
          rules (dates, currency, amounts, aliases) and inserted into the engine tables. Failed rows
          are counted, never guessed. You can Save Draft to keep progress without processing.
        </AlertDescription>
      </Alert>
    </div>
  )
}

