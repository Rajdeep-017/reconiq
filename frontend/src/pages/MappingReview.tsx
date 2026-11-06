'use client'

import { useState, useCallback } from 'react'
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSuggestMapping, useGetMapping, useSaveMapping } from '@/hooks/useMappings'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

const CANONICAL_FIELDS: { key: string; label: string; type: string; required: boolean }[] = [
  { key: 'order_reference', label: 'Order Reference', type: 'string', required: true },
  { key: 'order_date', label: 'Order Date', type: 'date', required: true },
  { key: 'net_amount', label: 'Net Amount', type: 'currency', required: true },
  { key: 'sku', label: 'SKU', type: 'string', required: false },
  { key: 'product_name', label: 'Product Name', type: 'string', required: false },
  { key: 'quantity', label: 'Quantity', type: 'number', required: false },
  { key: 'payment_method', label: 'Payment Method', type: 'string', required: false },
  { key: 'status', label: 'Status', type: 'string', required: false },
]

interface MappingField {
  source_column: string
  sample_values: string[]
  inferred_type: string
  mapped_target: string | null
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
  explanation: string
  warnings: string[]
}

export function MappingReview() {
  const { upload_id } = useParams<{ upload_id: string }>()
  const navigate = useNavigate()

  const [mappings, setMappings] = useState<MappingField[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [unmappedWarning, setUnmappedWarning] = useState<string[]>([])

  const suggestQuery = useSuggestMapping(upload_id || '')
  const getMappingQuery = useGetMapping(upload_id || '')
  const saveMutation = useSaveMapping()

  const isLoading = suggestQuery.isLoading || getMappingQuery.isLoading

  // Initialize mappings from AI suggestion
  React.useEffect(() => {
    if (suggestQuery.data) {
      const aiSuggestions = suggestQuery.data as any
      const mapped: MappingField[] = CANONICAL_FIELDS.map((field) => {
        const suggestion = aiSuggestions.suggestions?.find((s: any) => s.target_field === field.key) || {}
        return {
          source_column: suggestion.source_column || '',
          sample_values: suggestion.sample_values || [],
          inferred_type: suggestion.inferred_type || field.type,
          mapped_target: suggestion.source_column ? field.key : null,
          confidence: suggestion.confidence || 0,
          status: suggestion.source_column ? 'pending' : 'pending',
          explanation: suggestion.explanation || `Map ${field.label} from source column`,
          warnings: [],
        }
      })
      setMappings(mapped)
      updateWarnings()
    }
  }, [suggestQuery.data])

  const updateWarnings = useCallback(() => {
    const warnings: string[] = []
    const requiredUnmapped = CANONICAL_FIELDS.filter(f => f.required)
      .filter(f => !mappings.find(m => m.mapped_target === f.key && m.status !== 'rejected'))
    if (requiredUnmapped.length > 0) {
      warnings.push(`Required fields unmapped: ${requiredUnmapped.map(f => f.label).join(', ')}`)
    }

    const targets = mappings.filter(m => m.mapped_target).map(m => m.mapped_target)
    const duplicates = targets.filter((t, i) => targets.indexOf(t) !== i)
    if (duplicates.length > 0) {
      warnings.push(`Duplicate target mappings: ${duplicates.join(', ')}`)
    }

    setUnmappedWarning(warnings)
  }, [mappings])

  const handleTargetChange = useCallback((sourceColumn: string, targetKey: string | null) => {
    setMappings(prev => prev.map(m => {
      if (m.source_column === sourceColumn) {
        return { ...m, mapped_target: targetKey, status: targetKey ? 'pending' : 'pending' }
      }
      return m
    }))
    updateWarnings()
  }, [updateWarnings])

  const toggleApprove = useCallback((sourceColumn: string) => {
    setMappings(prev => prev.map(m => {
      if (m.source_column === sourceColumn) {
        return { ...m, status: m.status === 'approved' ? 'pending' : 'approved' }
      }
      return m
    }))
    updateWarnings()
  }, [updateWarnings])

  const rejectMapping = useCallback((sourceColumn: string) => {
    setMappings(prev => prev.map(m => {
      if (m.source_column === sourceColumn) {
        return { ...m, status: 'rejected', mapped_target: null }
      }
      return m
    }))
    updateWarnings()
  }, [updateWarnings])

  const handleSave = async () => {
    const approvedMappings = mappings.filter(m => m.status === 'approved' && m.mapped_target)
    if (approvedMappings.length === 0) {
      toast.error('Please approve at least one mapping before saving.')
      return
    }

    setIsSaving(true)
    try {
      const mappingsObj: Record<string, string> = {}
      approvedMappings.forEach(m => {
        if (m.mapped_target) mappingsObj[m.source_column] = m.mapped_target
      })

      await saveMutation.mutateAsync({
        upload_id: upload_id!,
        mappings: mappingsObj,
        approved: true,
      })

      setIsSaving(false)
      toast.success('Column mappings have been approved and saved as a template.')
      navigate(`/reconciliation`)
    } catch (err: unknown) {
      setIsSaving(false)
      const msg = (err as any)?.response?.data?.detail || 'Failed to save mappings.'
      toast.error(msg)
    }
  }

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'bg-green-100 text-green-800 border-green-200'
    if (c >= 0.5) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  if (isLoading) {
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
        <Card>
          <CardHeader><CardTitle>Loading suggestions…</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="flex-1 h-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (suggestQuery.error || getMappingQuery.error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load mapping data</AlertTitle>
        <AlertDescription>{String(suggestQuery.error || getMappingQuery.error)}</AlertDescription>
      </Alert>
    )
  }

  const approvedCount = mappings.filter(m => m.status === 'approved').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Column Mapping Review</h1>
          <p className="text-muted-foreground">
            Review and approve AI-suggested mappings between your report columns and ReconIQ fields.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" /> Save Template
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || approvedCount === 0}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving…
              </span>
            ) : (
              <span>Approve Mappings <CheckCircle2 className="h-4 w-4 ml-1" /></span>
            )}
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {unmappedWarning.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Mapping Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-1 text-sm">
              {unmappedWarning.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Source columns */}
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
                    <TableHead className="w-1/4">Preview</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium truncate-title" title={m.source_column}>
                        {m.source_column}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate-title" title={m.sample_values.join(', ')}>
                        {m.sample_values.slice(0, 3).join(', ')}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-xs">
                          {m.inferred_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.sample_values[0] || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Target mappings */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Target Field Mapping</CardTitle>
            <CardDescription>
              Map each source column to a ReconIQ internal field. AI suggestions are advisory — you must explicitly approve.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px] space-y-3">
              {mappings.map((m, i) => {
                const canonical = CANONICAL_FIELDS.find(f => f.key === m.mapped_target)
                return (
                  <Card key={i} className="p-3 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate-title" title={m.source_column}>
                          {m.source_column}
                        </span>
                        {m.status === 'approved' && (
                          <Badge variant="success" className="h-6 px-2 text-xs">Approved</Badge>
                        )}
                        {m.status === 'rejected' && (
                          <Badge variant="destructive" className="h-6 px-2 text-xs">Rejected</Badge>
                        )}
                      </div>
                      <Badge className={cn('h-6 px-2 text-xs', confidenceColor(m.confidence))}>
                        {(m.confidence * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target field</span>
                        <span className="font-medium">
                          {canonical ? canonical.label : 'Unmapped'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data type</span>
                        <span className="font-medium">{m.inferred_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-medium">
                          {(m.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-muted/50 rounded border border-border/50">
                      <p className="text-xs text-muted-foreground">{m.explanation}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant={m.status === 'approved' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => toggleApprove(m.source_column)}
                        disabled={m.status === 'rejected'}
                      >
                        {m.status === 'approved' ? 'Approved' : 'Approve'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rejectMapping(m.source_column)}
                      >
                        Reject
                      </Button>
                      <Select
                        value={m.mapped_target || ''}
                        onValueChange={(val) => handleTargetChange(m.source_column, val || null)}
                      >
                        <Select.Trigger className="w-[200px] h-8 text-xs">
                          <Select.Value placeholder="Select target…" />
                        </Select.Trigger>
                        <Select.Content>
                          {CANONICAL_FIELDS.map(f => (
                            <Select.Item key={f.key} value={f.key}>{f.label}</Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                  </Card>
                )
              })}
            </div>
          </CardContent>
          <CardFooter className="bg-transparent pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {approvedCount} of {mappings.length} mappings approved
              </span>
              <span className="text-xs text-muted-foreground">
                AI suggestions are advisory — explicit approval required
              </span>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Preview normalized output */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Normalized Output</CardTitle>
          <CardDescription>How your data will appear after normalization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded border border-border bg-muted/50 p-3 text-xs font-mono">
            <div className="mb-1">{'{'}</div>
            <div className="ml-4 mb-1">"order_reference": "ORD-2024-1128",</div>
            <div className="ml-4 mb-1">"net_amount": 2499.00,</div>
            <div className="ml-4 mb-1">"partner": "Amazon",</div>
            <div className="ml-4">{'}'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
