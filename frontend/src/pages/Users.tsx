'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'

export function Users() {
  const [search, setSearch] = useState('')

  const users = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'finance_cofounder', org: 'ReconIQ Org', active: true },
    { id: '2', name: 'Mike Roberts', email: 'mike@company.com', role: 'finance_executive', org: 'ReconIQ Org', active: true },
    { id: '3', name: 'Elena Davis', email: 'elena@company.com', role: 'member', org: 'ReconIQ Org', active: true },
    { id: '4', name: 'David Chen', email: 'david@company.com', role: 'viewer', org: 'ReconIQ Org', active: false },
  ]

  const roleBadge = (role: string) => {
    switch (role) {
      case 'finance_cofounder': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'finance_executive': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'member': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'viewer': return 'bg-slate-100 text-slate-800 border-slate-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and their access roles.
          </p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" /> Invite User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-1/4">Email</TableHead>
                  <TableHead className="w-1/6">Role</TableHead>
                  <TableHead className="w-1/6">Organization</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-medium">{u.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge className={roleBadge(u.role)}>{u.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.org}</TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'success' : 'destructive'}>
                          {u.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href="#">Edit Role</a>
                          </Button>
                          {!u.active && (
                            <Button variant="outline" size="sm" asChild>
                              <a href="#">Activate</a>
                            </Button>
                          )}
                        </div>
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
