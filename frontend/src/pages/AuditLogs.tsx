'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { Download } from 'lucide-react'

export function AuditLogs() {
  const [search, setSearch] = useState('')

  const logs = [
    { id: '1', user: 'Sarah Johnson', action: 'Created reconciliation run', target: 'Dec Orders vs Settlements', timestamp: '16 Dec 2024, 10:30 AM', status: 'success' },
    { id: '2', user: 'Mike Roberts', action: 'Approved column mapping', target: 'Amazon Orders Dec 2024', timestamp: '16 Dec 2024, 09:15 AM', status: 'success' },
    { id: '3', user: 'Sarah Johnson', action: 'Uploaded file', target: 'Flipkart Settlements Q4.csv', timestamp: '15 Dec 2024, 04:20 PM', status: 'success' },
    { id: '4', user: 'Elena Davis', action: 'Resolved discrepancy', target: 'DSC-2024-002', timestamp: '15 Dec 2024, 02:05 PM', status: 'success' },
    { id: '5', user: 'Mike Roberts', action: 'Submitted claim', target: 'CLM-E5F6G7H8', timestamp: '14 Dec 2024, 11:45 AM', status: 'success' },
    { id: '6', user: 'Sarah Johnson', action: 'Failed login attempt', target: 'auth/login', timestamp: '13 Dec 2024, 08:30 AM', status: 'failure' },
  ]

  const filtered = logs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (s: string) => s === 'success'
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-red-100 text-red-800 border-red-200'

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete history of every reconciliation run, match, and resolution.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export Logs
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="User, action, or target…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="w-1/4">Action</TableHead>
                  <TableHead className="w-1/4">Target</TableHead>
                  <TableHead className="w-1/4">Timestamp</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-32 text-center text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {l.user.charAt(0)}
                        </div>
                        <span className="font-medium">{l.user}</span>
                      </TableCell>
                      <TableCell className="text-sm">{l.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate-title" title={l.target}>{l.target}</TableCell>
                      <TableCell className="text-xs">{l.timestamp}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(l.status)}>{l.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
