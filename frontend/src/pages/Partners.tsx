'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'

export function Partners() {
  const [search, setSearch] = useState('')

  const partners = [
    { id: '1', name: 'Amazon', slug: 'amazon', document_types: 'Orders, Settlements, COD, Freight', is_default: true, created_at: '01 Jan 2024' },
    { id: '2', name: 'Flipkart', slug: 'flipkart', document_types: 'Orders, Settlements, COD, Freight', is_default: false, created_at: '01 Jan 2024' },
    { id: '3', name: 'Myntra', slug: 'myntra', document_types: 'Orders, Settlements, Freight, Returns', is_default: false, created_at: '15 Jan 2024' },
    { id: '4', name: 'Meesho', slug: 'meesho', document_types: 'Orders, Settlements, COD', is_default: false, created_at: '10 Feb 2024' },
  ]

  const filtered = partners.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-muted-foreground">
            Manage marketplace partners and their supported document types.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Add Partner
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
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
                  <TableHead className="w-1/4">Document Types</TableHead>
                  <TableHead className="w-1/6">Default</TableHead>
                  <TableHead className="w-1/6">Created</TableHead>
                  <TableHead className="w-1/6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No partners found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.document_types}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_default ? 'success' : 'secondary'}>
                          {p.is_default ? 'Default' : '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{p.created_at}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" asChild>
                            <a href="#">Edit</a>
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            Delete
                          </Button>
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
