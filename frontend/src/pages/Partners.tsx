'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, RefreshCw, Loader2 } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { usePartners, useCreatePartner } from '@/hooks/usePartners'
import { toast } from 'sonner'
import { extractErrorMessage } from '@/lib/api'

export function Partners() {
  const [search, setSearch] = useState('')
  const [newPartner, setNewPartner] = useState({
    name: '',
    code: '',
    partner_type: 'marketplace',
    description: '',
  })

  const { data: partners = [], isLoading, error, refetch } = usePartners()
  const createMutation = useCreatePartner()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Partners</h1>
            <p className="text-muted-foreground">
              Manage marketplace partners and their supported document types.
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
            <h1 className="text-2xl font-bold">Partners</h1>
            <p className="text-muted-foreground">
              Manage marketplace partners and their supported document types.
            </p>
          </div>
        </div>
        <Alert variant="destructive" onRetry={() => void refetch()} retryLabel="Retry">
          <AlertTitle>Failed to load partners</AlertTitle>
          <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const filtered = partners.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreatePartner = async () => {
    if (!newPartner.name || !newPartner.code || !newPartner.partner_type) return
    try {
      const created = await createMutation.mutateAsync(newPartner)
      setNewPartner({ name: '', code: '', partner_type: 'marketplace', description: '' })
      toast.success(`Partner "${created.name}" added.`)
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-muted-foreground">
            Manage marketplace partners and their supported document types.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button onClick={() => void handleCreatePartner()} disabled={createMutation.isPending || !newPartner.name || !newPartner.code}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Partner
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partner_search">Search</Label>
            <Input
              id="partner_search"
              placeholder="Partner name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead className="w-1/4">Type</TableHead>
                  <TableHead className="w-1/6">Status</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No partners found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.code} · {p.partner_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'success' : 'destructive'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.description ? (
                          <span className="text-xs text-muted-foreground truncate-title max-w-[260px] block" title={p.description}>
                            {p.description}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add New Partner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partner_name">Name</Label>
              <Input
                id="partner_name"
                name="name"
                value={newPartner.name}
                onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                placeholder="Amazon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_code">Code</Label>
              <Input
                id="partner_code"
                name="code"
                value={newPartner.code}
                onChange={(e) => setNewPartner({ ...newPartner, code: e.target.value })}
                placeholder="amazon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_type">Type</Label>
              <Select
                value={newPartner.partner_type}
                onValueChange={(v) => setNewPartner({ ...newPartner, partner_type: v as string })}
              >
                <Select.Trigger className="w-full">
                  <Select.Value placeholder="Select type…" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="marketplace">Marketplace</Select.Item>
                  <Select.Item value="logistics">Logistics</Select.Item>
                  <Select.Item value="payment_gateway">Payment Gateway</Select.Item>
                  <Select.Item value="cod_provider">COD Provider</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner_description">Description</Label>
            <Input
              id="partner_description"
              name="description"
              value={newPartner.description}
              onChange={(e) => setNewPartner({ ...newPartner, description: e.target.value })}
              placeholder="Partner description…"
            />
          </div>
          <Button
            onClick={handleCreatePartner}
            disabled={createMutation.isPending || !newPartner.name || !newPartner.code}
          >
            {createMutation.isPending ? 'Creating…' : 'Add Partner'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}