
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { useUsers, useUpdateUserRole, useDeactivateUser } from '@/hooks/useUsers'

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

  const { data: userList, isLoading, error } = useUsers({
    page: 1,
    page_size: 100,
  })
  const users = userList?.users || []
  const updateRoleMutation = useUpdateUserRole()
  const deactivateMutation = useDeactivateUser()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Manage team members and their access roles.
            </p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-border border-t-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Manage team members and their access roles.
            </p>
          </div>
        </div>
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <p className="text-red-800 text-sm">Failed to load users: {String(error)}</p>
        </div>
      </div>
    )
  }

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await updateRoleMutation.mutateAsync({ id, data: { role } })
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Failed to update role'
      alert(msg)
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    try {
      await deactivateMutation.mutateAsync(id)
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || 'Failed to deactivate user'
      alert(msg)
    }
  }

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
                        <span className="font-medium">{u.full_name}</span>
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
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Select
                            value={u.role}
                            onValueChange={(v) => handleRoleChange(u.id, v as string)}
                            disabled={updateRoleMutation.isPending}
                          >
                            <Select.Trigger className="w-[140px]">
                              <Select.Value placeholder={u.role.replace('_', ' ')} />
                            </Select.Trigger>
                            <Select.Content>
                              <Select.Item value="finance_executive">Finance Executive</Select.Item>
                              <Select.Item value="finance_cofounder">Finance Cofounder</Select.Item>
                              <Select.Item value="member">Member</Select.Item>
                              <Select.Item value="viewer">Viewer</Select.Item>
                            </Select.Content>
                          </Select>
                          {!u.is_active && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(u.id)}
                              disabled={deactivateMutation.isPending}
                            >
                              Activate
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
