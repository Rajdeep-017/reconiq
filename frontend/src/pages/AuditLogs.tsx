'use client'

import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function AuditLogs() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">
          Complete history of every reconciliation action.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Not implemented yet</AlertTitle>
        <AlertDescription>
          There is no audit-log backend yet — no events are recorded, so this page has no data and
          no mock history. Investigation, approval and run actions are currently traceable in the
          reconciliation runs (results carry explanations) and in the claims lifecycle.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Planned scope</CardTitle>
          <CardDescription>
            When the backend adds an audit trail, this page will list who uploaded, approved a
            mapping, executed a run, verified a discrepancy or moved a claim — with timestamps and
            outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/reconciliation">Open Reconciliation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
