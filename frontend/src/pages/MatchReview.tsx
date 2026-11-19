'use client'

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function MatchReview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Match Review</h1>
        <p className="text-muted-foreground">
          Manual review of ambiguous order-to-settlement matches.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Not implemented yet</AlertTitle>
        <AlertDescription>
          ReconIQ matches records deterministically on the normalized order reference, so there is
          no ambiguous-match queue to review yet. Every imported row either resolves to an order or
          is rejected during normalization; run verdicts, stream statuses and discrepancy reasons
          live in the Reconciliation and Discrepancies tabs.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Where to look instead</CardTitle>
          <CardDescription>
            A future phase can add engine-assisted candidate suggestions for low-confidence
            matches — nothing about it exists in the backend today, so this page intentionally has
            no mock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/reconciliation">Open Reconciliation</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/discrepancies">Open Discrepancies</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
