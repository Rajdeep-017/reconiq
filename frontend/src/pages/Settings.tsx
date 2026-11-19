'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'

export function Settings() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Account and organization settings.</p>
      </div>

      <Alert variant="warning">
        <AlertTitle>Preferences are read-only for now</AlertTitle>
        <AlertDescription>
          Editing organization profiles, security policies and notifications is not implemented in
          the backend yet — the controls below intentionally show real data without allowing fake
          changes.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Live data from the signed-in session</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{user?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <Badge variant="secondary" className="capitalize">
              {(user?.role ?? '').replace(/_/g, ' ')}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account status</p>
            <Badge variant={user?.is_active ? 'success' : 'destructive'}>
              {user?.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Organization ID</p>
            <p className="font-mono text-xs break-all">{user?.org_id ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Not implemented</CardTitle>
          <CardDescription>
            These areas require backend endpoints that do not exist yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Organization profile editing (name, contact email, timezone, currency).</p>
          <p>Two-factor authentication and session policy configuration.</p>
          <p>Email / push notification preferences.</p>
        </CardContent>
      </Card>
    </div>
  )
}
