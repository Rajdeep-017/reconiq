'use client'

import { useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUploadFile, useProcessUpload, useUploads } from '@/hooks/useUploads'
import { usePartners } from '@/hooks/usePartners'
import { truncate, cn } from '@/lib/utils'
import { extractErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Upload, FileX, Loader2, CheckCircle2, AlertCircle, RefreshCw, Play
} from 'lucide-react'
import { toast } from 'sonner'
import type { UploadResponse } from '@/types'

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

const DOCUMENT_TYPES = [
  { value: 'orders', label: 'Orders' },
  { value: 'settlements', label: 'Settlements' },
  { value: 'cod_remittances', label: 'COD Remittances' },
  { value: 'freight_invoices', label: 'Freight Invoices' },
  { value: 'returns', label: 'Returns' },
  { value: 'warehouse_scans', label: 'Warehouse Scans' },
]

const statusBadge = (status: string) => {
  switch (status) {
    case 'processed':
      return <Badge variant="success">Processed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'mapped':
      return <Badge variant="warning">Mapped</Badge>
    case 'processing':
      return (
        <Badge variant="warning" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      )
    default:
      return <Badge variant="secondary">{status === 'uploaded' || status === 'parsed' ? 'Parsed' : status}</Badge>
  }
}

export function UploadReports() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [partnerId, setPartnerId] = useState<string>('')
  const [documentType, setDocumentType] = useState<string>('')

  const { data: partners = [] } = usePartners()
  const uploadsQuery = useUploads({ page: 1, pageSize: 50 })
  const uploads = uploadsQuery.data?.uploads ?? []
  const totalUploads = uploadsQuery.data?.total ?? uploads.length

  const uploadMutation = useUploadFile()
  const processMutation = useProcessUpload()
  const isUploading = uploadMutation.isPending
  const canSubmit = !!selectedFile && !!documentType && !isUploading

  const validateFile = useCallback((file: File): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []

    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}. Only CSV and XLSX files are supported.`)
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`File size exceeds ${MAX_FILE_SIZE_MB} MB limit.`)
    }

    if (file.size === 0) {
      errors.push('File appears to be empty.')
    }

    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'csv' && extension !== 'xlsx') {
      errors.push('Only .csv and .xlsx files are supported.')
    }

    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large file — processing may take longer.')
    }

    return { valid: errors.length === 0, errors, warnings }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    setSubmissionError(null)
    setValidationResult(null)
    const validation = validateFile(file)
    setValidationResult(validation)
    if (validation.valid) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
      setSubmissionError(validation.errors.join(' '))
    }
  }, [validateFile])

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setValidationResult(null)
    setSubmissionError(null)
  }, [])

  const handleSubmit = async () => {
    if (!selectedFile || !documentType) return
    setSubmissionError(null)
    try {
      const created = await uploadMutation.mutateAsync({
        file: selectedFile,
        document_type: documentType,
        partner_id: partnerId || undefined,
      })
      removeFile()
      toast.success(`File "${created.original_filename}" uploaded and parsed. Review the column mapping next.`)
      navigate(`/uploads/${created.id}/mapping`)
    } catch (err) {
      setSubmissionError(extractErrorMessage(err))
      toast.error(extractErrorMessage(err))
    }
  }

  const handleReprocess = async (upload: UploadResponse) => {
    try {
      const done = await processMutation.mutateAsync(upload.id)
      if (done.status === 'processed') {
        toast.success(`Re-processed "${done.original_filename}": ${done.processed_count} rows normalized.`)
      } else {
        toast.error(
          `Processing finished with status "${done.status}"${done.error_message ? `: ${done.error_message}` : ''}.`
        )
      }
    } catch (err) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Financial Reports</h1>
          <p className="text-muted-foreground">
            Upload marketplace, payment gateway, COD, logistics, return and warehouse-scan reports for reconciliation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void uploadsQuery.refetch()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Two-column upload workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)] gap-6">
        {/* Main column: Upload form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New Upload</CardTitle>
              <CardDescription>
                Choose a partner and report type, then upload your file. Column mapping review
                opens automatically after parsing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Partner & Report Type selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="partner">Partner (optional)</Label>
                  <Select
                    value={partnerId}
                    onValueChange={(val) => setPartnerId(val)}
                    disabled={isUploading}
                  >
                    <Select.Trigger className="w-full">
                      <Select.Value placeholder={partners.length ? 'No partner selected' : 'No partners yet'} />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="" className="text-muted-foreground">
                        No partner
                      </Select.Item>
                      {partners.map((p) => (
                        <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document_type">Report Type</Label>
                  <Select
                    value={documentType}
                    onValueChange={(val) => setDocumentType(val)}
                    disabled={isUploading}
                  >
                    <Select.Trigger className="w-full">
                      <Select.Value placeholder="Select report type…" />
                    </Select.Trigger>
                    <Select.Content>
                      {DOCUMENT_TYPES.map((dt) => (
                        <Select.Item key={dt.value} value={dt.value}>{dt.label}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 min-h-[220px]',
                  isUploading
                    ? 'border-primary bg-primary/50'
                    : 'border-border bg-secondary/50 hover:border-primary/50 hover:bg-primary/10',
                  isUploading && 'pointer-events-none opacity-60'
                )}
              >
                <div className="flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    Drag &amp; drop your file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV or XLSX · Max {MAX_FILE_SIZE_MB} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      const input = document.getElementById('file-input') as HTMLInputElement
                      input?.click()
                    }}
                    className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Browse files
                  </button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                    }}
                  />
                </div>
              </div>

              {/* Selected file details */}
              {selectedFile && (
                <div className="bg-card border border-border rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0">
                      <span className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
                        {selectedFile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate-title" title={selectedFile.name}>
                        {truncate(selectedFile.name, 40)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'csv/xlsx'}
                      </p>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      aria-label="Remove file"
                    >
                      <FileX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Validation results */}
              {validationResult && validationResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg text-sm border bg-amber-50 border-amber-100 text-amber-800">
                  {validationResult.warnings.join(' ')}
                </div>
              )}

              {submissionError && (
                <Alert variant="destructive" onRetry={removeFile} retryLabel="Clear file">
                  <AlertTitle>Upload Error</AlertTitle>
                  <AlertDescription>{submissionError}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end items-center">
                {isUploading && (
                  <div className="flex items-center gap-2 mr-auto">
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Uploading and parsing on the server…
                    </span>
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </span>
                  ) : (
                    <span>Upload Report</span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Upload History</CardTitle>
                <CardDescription>
                  All files in this organization ({totalUploads}). Status polls automatically while
                  files are still moving through the pipeline.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {uploads.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
                  No uploads yet — add your first file above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Partner</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="min-w-[240px]">Details</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium truncate-title max-w-[200px]" title={u.original_filename}>
                          {u.original_filename}
                        </TableCell>
                        <TableCell className="capitalize text-xs">
                          {u.document_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-xs">
                          —
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {u.row_count ?? '—'}
                        </TableCell>
                        <TableCell>{statusBadge(u.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.status === 'processed'
                            ? `${u.processed_count} processed · ${u.rejected_count} rejected · ${u.duplicate_count} duplicates`
                            : u.status === 'failed'
                              ? (u.error_message ?? 'Processing failed')
                              : 'Awaiting mapping approval'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(u.status === 'parsed' || u.status === 'uploaded' || u.status === 'mapped') && (
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`/uploads/${u.id}/mapping`}>
                                  {u.status === 'mapped' ? 'Continue Mapping' : 'Map Columns'}
                                </Link>
                              </Button>
                            )}
                            {(u.status === 'processed' || u.status === 'failed') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleReprocess(u)}
                                disabled={processMutation.isPending}
                                title="Re-run normalization with the approved mapping"
                              >
                                {processMutation.isPending && processMutation.variables === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Play className="h-4 w-4 mr-1" />
                                )}
                                Re-process
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

          {uploadsQuery.error && (
            <Alert
              variant="destructive"
              onRetry={() => void uploadsQuery.refetch()}
              retryLabel="Retry"
            >
              <AlertTitle>Failed to load upload history</AlertTitle>
              <AlertDescription>{extractErrorMessage(uploadsQuery.error)}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Supporting column: Instructions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {[
                  'Upload & parse — headers and row samples are stored.',
                  'Column mapping — map source headers to canonical fields, approve.',
                  'Normalization — dates, amounts and aliases are cleaned; rows land in engine tables.',
                  'Reconciliation — create and execute a run per stream in the Reconciliation tab.',
                  'Review — discrepancies and draft claims appear in their tabs automatically.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supported Formats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>CSV and XLSX, UTF-8, with a header row. Max {MAX_FILE_SIZE_MB} MB.</p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                Order reference is required for every report type; the engine matches records on it.
              </p>
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                Rejected rows are counted, never silently dropped — check the history table.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
