'use client'

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  FileText, CheckCircle2, X, AlertTriangle, Clock,
  ArrowLeft
} from 'lucide-react'
import { useToast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

interface SourceTransaction {
  reference: string
  order_reference: string
  amount: string
  date: string
  partner: string
  source_file: string
  document_type: string
}

interface CandidateMatch {
  id: string
  order_reference: string
  amount: string
  date: string
  awb_number: string | null
  date_difference: string
  amount_difference: string
  explanation: string
  confidence: number
  match_type: 'exact' | 'fuzzy_high' | 'fuzzy_low' | 'manual'
}

export function MatchReview() {
  const { match_id: _match_id } = useParams<{ match_id: string }>()
  const navigate = useNavigate()
  const { show: toast } = useToast()

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>('cand-1')

  const source: SourceTransaction = {
    reference: 'TXN-2024-8842',
    order_reference: 'ORD-2024-1128',
    amount: '₹2,499.00',
    date: '15 Dec 2024',
    partner: 'Amazon',
    source_file: 'amazon_orders_dec_2024.csv',
    document_type: 'orders',
  }

  const candidates: CandidateMatch[] = [
    {
      id: 'cand-1',
      order_reference: 'ORD-2024-1128',
      amount: '₹2,499.00',
      date: '16 Dec 2024',
      awb_number: 'AWB-8842001',
      date_difference: '1 day',
      amount_difference: '₹0.00',
      explanation: 'Order reference matches exactly. Amount matches within tolerance. Date within 1 day.',
      confidence: 0.98,
      match_type: 'exact',
    },
    {
      id: 'cand-2',
      order_reference: 'ORD-2024-1129',
      amount: '₹2,499.00',
      date: '15 Dec 2024',
      awb_number: 'AWB-8842002',
      date_difference: '0 days',
      amount_difference: '₹0.00',
      explanation: 'Amount matches exactly. Order reference similar (ORD-2024-1129 vs ORD-2024-1128). Date matches exactly.',
      confidence: 0.72,
      match_type: 'fuzzy_high',
    },
    {
      id: 'cand-3',
      order_reference: 'ORD-2024-1145',
      amount: '₹2,550.00',
      date: '14 Dec 2024',
      awb_number: null,
      date_difference: '1 day',
      amount_difference: '₹51.00',
      explanation: 'Amount differs by ₹51.00 (2%). Order reference partially matches. Date within 1 day.',
      confidence: 0.45,
      match_type: 'fuzzy_low',
    },
  ]

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId) || candidates[0]

  const confidenceLabel = (c: number) => {
    if (c >= 0.8) return { label: 'High confidence', variant: 'success' as const }
    if (c >= 0.5) return { label: 'Medium confidence', variant: 'warning' as const }
    return { label: 'Low confidence', variant: 'destructive' as const }
  }

  const handleAccept = () => {
    toast.success(`Order ${source.order_reference} matched to ${selectedCandidate.order_reference}.`)
    navigate('/reconciliation')
  }

  const handleReject = () => {
    toast.error('The suggested match has been rejected. The transaction will be flagged for manual review.')
  }

  const handleUnresolved = () => {
    toast.warning('This match has been marked as unresolved and will require supervisor review.')
  }

  const handleViewSource = () => {
    toast.info('Opening source record details…')
  }

  const handleAuditHistory = () => {
    toast.info('Loading audit trail…')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Match Review</h1>
          <p className="text-muted-foreground">
            Review ambiguous order-to-settlement matches. No match is approved automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/reconciliation')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Workspace
          </Button>
        </div>
      </div>

      {/* Source transaction info bar */}
      <Card className="border-l-4 border-primary">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{source.reference}</span>
            </div>
            <Badge variant="secondary">{source.partner}</Badge>
            <Badge variant="secondary">{source.document_type}</Badge>
          </div>
          <CardTitle className="mt-2">{source.order_reference}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-0">
          <div>
            <span className="text-xs text-muted-foreground block">Amount</span>
            <span className="font-mono font-medium">{source.amount}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Transaction Date</span>
            <span className="font-medium">{source.date}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Source File</span>
            <span className="text-sm truncate-title" title={source.source_file}>{source.source_file}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Document Type</span>
            <span className="font-medium">{source.document_type}</span>
          </div>
        </CardContent>
      </Card>

      {/* Comparison panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        {/* Left panel: Source */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Original Source Transaction</CardTitle>
            <CardDescription>Transaction as it appears in the source file</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Transaction Reference</span>
                <span className="font-mono text-sm">{source.reference}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Order Reference</span>
                <span className="font-mono text-sm">{source.order_reference}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-mono font-medium">{source.amount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Transaction Date</span>
                <span className="text-sm">{source.date}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Partner</span>
                <span className="text-sm">{source.partner}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Source File</span>
                <span className="text-sm truncate-title" title={source.source_file}>{source.source_file}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Document Type</span>
                <span className="text-sm capitalize">{source.document_type}</span>
              </div>
            </div>
            <CardFooter className="pt-4 border-t-0">
              <Button
                variant="outline"
                onClick={handleViewSource}
                className="w-full"
              >
                View Source Record
              </Button>
            </CardFooter>
          </CardContent>
        </Card>

        {/* Right panel: Candidates */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Suggested Matching Orders</CardTitle>
            <CardDescription>
              Candidates identified by the reconciliation engine. Select one to review details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {candidates.map((c) => {
                const isSelected = c.id === selectedCandidateId
                const conf = confidenceLabel(c.confidence)
                return (
                  <Card
                    key={c.id}
                    className={cn(
                      'cursor-pointer border p-3 hover:bg-accent transition-colors',
                      isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'
                    )}
                    onClick={() => setSelectedCandidateId(c.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{c.order_reference}</span>
                      <Badge variant={conf.variant} className="text-xs">
                        {conf.label}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">{c.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">{c.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">AWB</span>
                        <span className="font-medium">{c.awb_number || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date diff.</span>
                        <span className="font-medium">{c.date_difference}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount diff.</span>
                        <span className="font-medium">{c.amount_difference}</span>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-muted/50 rounded border border-border/50">
                      <p className="text-xs text-muted-foreground">{c.explanation}</p>
                    </div>
                  </Card>
                )
              })}
              {candidates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>No matching candidates found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected candidate detail */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Candidate: {selectedCandidate.order_reference}</CardTitle>
          <CardDescription>Review the match details before making a decision</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Amount Comparison</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-medium">{source.amount}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-lg font-mono font-medium">{selectedCandidate.amount}</span>
              </div>
              <span className="text-xs text-muted-foreground block">
                Difference: {selectedCandidate.amount_difference}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Date Comparison</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-medium">{source.date}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="text-lg font-mono font-medium">{selectedCandidate.date}</span>
              </div>
              <span className="text-xs text-muted-foreground block">
                Difference: {selectedCandidate.date_difference}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AWB Comparison</h3>
              <div className="mt-1">
                <span className="text-xs text-muted-foreground block">Source:</span>
                <span className="text-sm font-medium">—</span>
              </div>
              <div className="mt-1">
                <span className="text-xs text-muted-foreground block">Candidate:</span>
                <span className="text-sm font-medium">{selectedCandidate.awb_number || 'Not available'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Matching Explanation</h3>
              <p className="mt-1 text-sm">{selectedCandidate.explanation}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Confidence Score</span>
              <Badge className={cn('ml-auto', confidenceLabel(selectedCandidate.confidence).variant === 'success' ? 'bg-green-100 text-green-800 border-green-200' : confidenceLabel(selectedCandidate.confidence).variant === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200')}>
                {(selectedCandidate.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={handleAuditHistory}>
            <Clock className="h-4 w-4 mr-2" /> View Audit History
          </Button>
          <Button variant="outline" onClick={handleUnresolved}>
            <AlertTriangle className="h-4 w-4 mr-2" /> Mark Unresolved
          </Button>
          <Button variant="outline" onClick={handleReject}>
            <X className="h-4 w-4 mr-2" /> Reject Match
          </Button>
          <Button onClick={handleAccept}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Accept Match
          </Button>
        </CardFooter>
      </Card>

      <Alert variant="info">
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Ambiguous matches are never automatically approved. You must explicitly accept, reject, or mark each match as unresolved.
        </AlertDescription>
      </Alert>
    </div>
  )
}
