'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts'
export function Analytics() {
  const [dateRange, setDateRange] = useState('30d')
  const [partnerFilter, setPartnerFilter] = useState('')
  const [categoryFilter] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Data-driven financial analytics for reconciliation performance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Select range…" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
                <Select.Item value="1y">Last year</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Partner</Label>
            <Select value={partnerFilter} onValueChange={(v) => setPartnerFilter(v as string)}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All partners" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="amazon">Amazon</Select.Item>
                <Select.Item value="flipkart">Flipkart</Select.Item>
                <Select.Item value="myntra">Myntra</Select.Item>
                <Select.Item value="meesho">Meesho</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryFilter}>
              <Select.Trigger className="w-full">
                <Select.Value placeholder="All categories" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="short_payment">Short Payment</Select.Item>
                <Select.Item value="missing_settlement">Missing Settlement</Select.Item>
                <Select.Item value="freight_overcharge">Freight Overcharge</Select.Item>
                <Select.Item value="cod_remittance">COD Remittance</Select.Item>
                <Select.Item value="return_refund">Return/Refund</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full">Apply Filters</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Settlement trends */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: 'Week 1', expected: 120000, received: 115000 },
                    { name: 'Week 2', expected: 145000, received: 140000 },
                    { name: 'Week 3', expected: 168000, received: 160000 },
                    { name: 'Week 4', expected: 192000, received: 185000 },
                    { name: 'Week 5', expected: 210000, received: 205000 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expected" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Partner matching rates */}
        <Card>
          <CardHeader>
            <CardTitle>Partner-wise Matching Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Amazon', rate: 94 },
                    { name: 'Flipkart', rate: 87 },
                    { name: 'Myntra', rate: 91 },
                    { name: 'Meesho', rate: 82 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Match Rate (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 3. Partner discrepancy values */}
        <Card>
          <CardHeader>
            <CardTitle>Partner-wise Discrepancy Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Amazon', value: 4500 },
                    { name: 'Flipkart', value: 3200 },
                    { name: 'Myntra', value: 1800 },
                    { name: 'Meesho', value: 2100 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Discrepancy Value (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 4. Freight overcharge */}
        <Card>
          <CardHeader>
            <CardTitle>Freight Overcharge Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Amazon', overcharge: 850 },
                    { name: 'Flipkart', overcharge: 620 },
                    { name: 'Myntra', overcharge: 410 },
                    { name: 'Meesho', overcharge: 290 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Overcharge (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="overcharge" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 5. COD remittance */}
        <Card>
          <CardHeader>
            <CardTitle>COD Remittance Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: 'Week 1', remitted: 45000, collected: 48000 },
                    { name: 'Week 2', remitted: 52000, collected: 55000 },
                    { name: 'Week 3', remitted: 48000, collected: 51000 },
                    { name: 'Week 4', remitted: 58000, collected: 62000 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="remitted" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 6. Return/refund discrepancy */}
        <Card>
          <CardHeader>
            <CardTitle>Return/Refund Discrepancy Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Processed', value: 65, fill: '#10b981' },
                      { name: 'Pending', value: 25, fill: '#f59e0b' },
                      { name: 'Mismatched', value: 10, fill: '#ef4444' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Tooltip />
                    <Legend />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 7. Claim recovery trends */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Recovery Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: 'Week 1', recovered: 1200 },
                    { name: 'Week 2', recovered: 1800 },
                    { name: 'Week 3', recovered: 2400 },
                    { name: 'Week 4', recovered: 3100 },
                    { name: 'Week 5', recovered: 3900 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Recovered (₹)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="recovered" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 8. Month-wise reconciliation */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Month-wise Reconciliation Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Oct', matched: 880, unmatched: 120 },
                    { name: 'Nov', matched: 920, unmatched: 80 },
                    { name: 'Dec', matched: 945, unmatched: 55 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matched" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unmatched" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
