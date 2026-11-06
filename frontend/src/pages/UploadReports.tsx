'use client'

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUploadFile, usePartners, useUploads } from '@/hooks/useUploads'
import { truncate, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Upload, FileX, Plus, Loader2, CheckCircle2, AlertCircle,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']

const DOCUMENT_TYPES = [
  { value: 'orders', label: 'Orders' },
  { value: 'settlements', label: 'Settlements' },
  { value: 'freight', label: 'Freight Invoices' },
  { value: 'cod_remittances', label: 'COD Remittances' },
  { value: 'returns', label: 'Returns' },
]

export function UploadReports() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStage, setUploadStage] = useState<'idle' | 'validating' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string>('')
  const [documentType, setDocumentType] = useState<string>('')
  const { data: partners } = usePartners()
  const { refetch: refetchUploads } = useUploads()

  const uploadMutation = useUploadFile()

  const isUploading = uploadMutation.isPending
  const isDisabled = !selectedFile || !partnerId || !documentType || isUploading || uploadStage === 'uploading'

  // Validate file before submission
  const validateFile = useCallback((file: File): { valid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = []
    const warnings: string[] = []

    if (!ACCEPTED_TYPES.includes(file.type)) {
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

  // Handle drag-over to prevent default browser behavior
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
    setError(null)
    setValidationResult(null)
    setUploadStage('idle')
    setUploadProgress(0)

    const validation = validateFile(file)
    setValidationResult(validation)

    if (validation.valid) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
      setError(validation.errors.join(' '))
    }
  }, [validateFile])

  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setValidationResult(null)
    setError(null)
    setUploadStage('idle')
    setUploadProgress(0)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setError(null)
    setUploadStage('validating')
    setUploadProgress(0)

    // Simulate validation stage
    setTimeout(() => {
      setUploadStage('uploading')
    }, 500)

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        document_type: documentType,
        partner_id: partnerId || undefined,
      })

      setUploadStage('processing')
      setUploadProgress(100)

      await refetchUploads()
      setTimeout(() => {
        setUploadStage('completed')
        toast.success(`File "${result.original_filename}" uploaded and queued for processing.`)
        navigate(`/uploads/${result.id}/mapping`)
      }, 1000)
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Upload failed. Please try again.'
      setError(msg)
      setUploadStage('error')
      setUploadProgress(0)
      toast.error(msg)
    }
  }

  const retryUpload = useCallback(() => {
    if (!selectedFile) return
    setError(null)
    setUploadStage('uploading')
    setUploadProgress(0)
    handleSubmit(new Event('submit') as unknown as React.FormEvent)
  }, [selectedFile, handleSubmit])

  const fileSize = selectedFile?.size || 0
  const fileSizeKB = (fileSize / 1024).toFixed(1)
  const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Upload Financial Reports</h1>
          <p className="text-muted-foreground">
            Upload marketplace, payment gateway, COD, logistics, and return reports for reconciliation.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> New Upload
        </Button>
      </div>

      {/* Upload form */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Select Report</CardTitle>
          <CardDescription>
            Choose a partner and report type, then upload your file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Partner selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Partner</Label>
              <Select
                value={partnerId}
                onValueChange={(val) => setPartnerId(val as string)}
                disabled={isUploading}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Select partner..." />
                </Select.Trigger>
                <Select.Content>
                  {(partners || []).map((p) => (
                    <Select.Item key={p.id} value={p.id}>{p.name}</Select.Item>
                  ))}
                  <Select.Item value="amazon">Amazon</Select.Item>
                  <Select.Item value="flipkart">Flipkart</Select.Item>
                  <Select.Item value="myntra">Myntra</Select.Item>
                  <Select.Item value="meesho">Meesho</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={documentType}
                onValueChange={(val) => setDocumentType(val as string)}
                disabled={isUploading}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Select report type..." />
                </Select.Trigger>
                <Select.Content>
                  {DOCUMENT_TYPES.map((dt) => (
                    <Select.Item key={dt.value} value={dt.value}>{dt.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
              uploadStage === 'uploading' || uploadStage === 'processing'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-muted/50 hover:border-primary/50 hover:bg-primary/5',
              isUploading && 'pointer-events-none opacity-60'
            )}
          >
            <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drag & drop your file here
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
                className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
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
              <div className="flex items-center gap-3 mb-2">
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {selectedFile?.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate-title" title={selectedFile.name}>
                  {truncate(selectedFile.name, 40)}
                </span>
                <button
                  onClick={removeFile}
                  className="ml-auto p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                  aria-label="Remove file"
                >
                  <FileX className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>File size</span>
                  <span>{parseFloat(fileSizeMB) > 1 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`}</span>
                </div>
                <div className="flex justify-between">
                  <span>File type</span>
                  <span>{selectedFile.type}</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation results */}
          {validationResult && (
            <div className={cn(
              'p-3 rounded-lg text-sm',
              validationResult.valid ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
            )}>
              <div className="flex items-start gap-2">
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                )}
                <div>
                  {validationResult.valid ? (
                    <p className="font-medium text-green-800">File passed validation</p>
                  ) : (
                    <p className="font-medium text-red-800">Validation failed</p>
                  )}
                  {validationResult.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                      {validationResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <ul className="mt-1 list-disc list-inside text-sm text-amber-700">
                      {validationResult.warnings.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Upload Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-end">
            <div className="flex items-center gap-2">
              {isUploading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Uploading…</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={removeFile}
                disabled={isUploading || !selectedFile}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isDisabled}
                className="flex items-center gap-2"
              >
                {uploadStage === 'uploading' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </span>
                ) : uploadStage === 'processing' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </span>
                ) : (
                  <span>Upload Report</span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress section */}
      {(uploadStage === 'uploading' || uploadStage === 'processing') && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{uploadStage === 'uploading' ? 'Uploading file…' : 'Processing file…'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </CardContent>
        </Card>
      )}

      {/* Completed state */}
      {uploadStage === 'completed' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle>Upload Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Your file has been uploaded and is being processed.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" asChild>
                <a href="/uploads">View Upload History</a>
              </Button>
              <Button asChild onClick={() => navigate('/mapping')}>
                Review Column Mapping <ExternalLink className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state with retry */}
      {uploadStage === 'error' && selectedFile && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Upload Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={removeFile}>
                Remove File
              </Button>
              <Button onClick={retryUpload}>
                <Loader2 className="h-4 w-4 animate-spin" /> Retry Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
