
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, RefreshCw, Loader2, UserX } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { useUsers, useUpdateUserRole, useDeactivateUser } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api'

const roleBadge = (role: string) => {
  switch (role) {
    case 'finance_cofounder':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'finance_executive':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'member':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'viewer':
      return 'bg-slate-100 text-slate-800 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export function Users() {
  const [search, setSearch] = useState('')
  const { user: currentUser } = useAuth()

  const { data: userList, isLoading, error, refetch } = useUsers({
    page: 1,
    page_size: 100,
  })
  const users = userList?.users || []
  const updateRoleMutation = useUpdateUserRole()
  const deactivateMutation = useDeactivateUser()

  const isCofounder = currentUser?.role === 'finance_cofounder'

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage team members and their access roles.</p>
        </div>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading users…</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage team members and their access roles.</p>
          </div>
        </div>
        <Alert variant="destructive" onRetry={() => void refetch()} retryLabel="Retry">
          <AlertTitle>Failed to load users</AlertTitle>
          <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleRoleChange = async (id: string, role: string) => {
    try {
      const updated = await updateRoleMutation.mutateAsync({ id, data: { role } })
      toast.success(`${updated.full_name}'s role is now ${role.replace(/_/g, ' ')}.`)
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err))
    }
  }

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate ${name}? The account cannot be re-activated from this UI yet.`)) return
    try {
      await deactivateMutation.mutateAsync(id)
      toast.success(`${name} deactivated.`)
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and their access roles.
            {!isCofounder && ' Role changes and deactivation require a finance cofounder.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_search">Search</Label>
            <Input
              id="user_search"
              name="search"
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
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {u.full_name.charAt(0)}
                        </div>
                        <span className="font-medium">
                          {u.full_name}
                          {u.id === currentUser?.id && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge className={roleBadge(u.role)}>
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'destructive'}>
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          {u.is_active ? (
                            <>
                              <Select
                                value={u.role}
                                onValueChange={(v) => void handleRoleChange(u.id, v)}
                                disabled={!isCofounder || updateRoleMutation.isPending || u.id === currentUser?.id}
                              >
                                <Select.Trigger className="w-[150px] h-8 text-xs">
                                  <Select.Value placeholder={u.role.replace('_', ' ')} />
                                </Select.Trigger>
                                <Select.Content>
                                  <Select.Item value="finance_executive">Finance Executive</Select.Item>
                                  <Select.Item value="finance_cofounder">Finance Cofounder</Select.Item>
                                  <Select.Item value="member">Member</Select.Item>
                                  <Select.Item value="viewer">Viewer</Select.Item>
                                </Select.Content>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeactivate(u.id, u.full_name)}
                                disabled={!isCofounder || deactivateMutation.isPending || u.id === currentUser?.id}
                                title={isCofounder ? 'Deactivate account' : 'Only a finance cofounder can deactivate users'}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 opacity-40" />
                              No actions — re-activation is not supported yet
                            </span>
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
