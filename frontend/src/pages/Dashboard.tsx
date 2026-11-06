'use client'

import { useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import { formatCurrencyINR } from '@/lib/utils'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import {
  LayoutDashboard, AlertCircle, FileText,
  TrendingUp, Coins, CheckCircle
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'



const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { label: string; positive: boolean }
}) => (
  <Card className="overflow-hidden min-w-[200px]">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
      {trend && (
        <p className={`text-xs mt-1 ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.label}
        </p>
      )}
      {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
    </CardContent>
  </Card>
)

export function Dashboard() {
  const { data, isLoading, error } = useDashboard()
  const [dateRange] = useState('30d')

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="h-32">
            <CardContent>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load dashboard</AlertTitle>
        <AlertDescription>{String(error)}</AlertDescription>
      </Alert>
    )
  }

  const metrics = data!

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-subtitle">Financial reconciliation overview for your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            {dateRange} <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </Button>
          <Button className="ml-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Export
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Orders"
          value={metrics.total_orders.toLocaleString()}
          icon={LayoutDashboard}
          trend={{ label: 'All uploaded orders', positive: true }}
        />
        <KPICard
          title="Matched Orders"
          value={metrics.matched_orders.toLocaleString()}
          icon={CheckCircle}
          trend={{ label: `${metrics.matching_rate}% matched`, positive: metrics.matching_rate > 80 }}
        />
        <KPICard
          title="Unmatched Orders"
          value={metrics.unmatched_orders.toLocaleString()}
          icon={AlertCircle}
          trend={{ label: `Needs review`, positive: metrics.unmatched_orders === 0 }}
        />
        <KPICard
          title="Matching Rate"
          value={`${metrics.matching_rate}%`}
          icon={TrendingUp}
          trend={{ label: 'Order match accuracy', positive: metrics.matching_rate > 80 }}
        />
        <KPICard
          title="Expected Settlement"
          value={formatCurrencyINR(metrics.total_expected)}
          subtitle="Orders × expected net"
          icon={Coins}
          trend={{ label: 'Total expected', positive: true }}
        />
        <KPICard
          title="Actual Settlement"
          value={formatCurrencyINR(metrics.total_received)}
          subtitle="Amounts actually received"
          icon={Coins}
          trend={{ label: 'Total received', positive: Number(metrics.total_received) > 0 }}
        />
        <KPICard
          title="Total Discrepancies"
          value={metrics.discrepancy_count.toLocaleString()}
          icon={AlertCircle}
          trend={{ label: 'Issues detected', positive: metrics.discrepancy_count === 0 }}
        />
        <KPICard
          title="Verified Claimable"
          value={formatCurrencyINR(metrics.verified_claimable)}
          subtitle="Ready for claim submission"
          icon={FileText}
          trend={{ label: 'Recovery potential', positive: Number(metrics.verified_claimable) > 0 }}
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlement Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Settlement Trend</CardTitle>
            <CardDescription>Expected vs received settlement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: 'Mon', expected: 125000, received: 118000 },
                    { name: 'Tue', expected: 142000, received: 139000 },
                    { name: 'Wed', expected: 158000, received: 155000 },
                    { name: 'Thu', expected: 175000, received: 168000 },
                    { name: 'Fri', expected: 192000, received: 185000 },
                    { name: 'Sat', expected: 210000, received: 205000 },
                    { name: 'Sun', expected: 185000, received: 180000 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="expected" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Matching Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Order Matching Trend</CardTitle>
            <CardDescription>Matched vs unmatched orders over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Week 1', matched: 85, unmatched: 15 },
                    { name: 'Week 2', matched: 92, unmatched: 8 },
                    { name: 'Week 3', matched: 88, unmatched: 12 },
                    { name: 'Week 4', matched: 94, unmatched: 6 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="matched" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unmatched" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Partner Performance */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Partner Reconciliation Performance</CardTitle>
            <CardDescription>Matching rate by marketplace partner</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Amazon', value: 94 },
                    { name: 'Flipkart', value: 87 },
                    { name: 'Myntra', value: 91 },
                    { name: 'Meesho', value: 82 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Match Rate (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Discrepancy Breakdown */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Discrepancy Category Breakdown</CardTitle>
            <CardDescription>Issues detected by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Short Payment', value: 45, fill: '#ef4444' },
                      { name: 'Missing Settlement', value: 28, fill: '#f59e0b' },
                      { name: 'Freight Overcharge', value: 15, fill: '#0ea5e9' },
                      { name: 'COD Remittance', value: 12, fill: '#8b5cf6' },
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
      </div>

      {/* Operational Section */}
      <Separator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/uploads">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">File</TableHead>
                    <TableHead className="w-1/6">Partner</TableHead>
                    <TableHead className="w-1/6">Type</TableHead>
                    <TableHead className="w-1/6">Rows</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="truncate-title" title="Amazon Orders Dec 2024">Amazon Orders Dec 2024</TableCell>
                    <TableCell>Amazon</TableCell>
                    <TableCell>Orders</TableCell>
                    <TableCell className="text-right">1,250</TableCell>
                    <TableCell>
                      <Badge variant="success">Parsed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="Flipkart Settlements Q4">Flipkart Settlements Q4</TableCell>
                    <TableCell>Flipkart</TableCell>
                    <TableCell>Settlements</TableCell>
                    <TableCell className="text-right">890</TableCell>
                    <TableCell>
                      <Badge variant="warning">Mapping</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="Myntra Freight Invoices">Myntra Freight Invoices</TableCell>
                    <TableCell>Myntra</TableCell>
                    <TableCell>Freight</TableCell>
                    <TableCell className="text-right">445</TableCell>
                    <TableCell>
                      <Badge variant="success">Normalized</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reconciliation Runs */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Reconciliation Runs</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/reconciliation">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Run Name</TableHead>
                    <TableHead className="w-1/6">Type</TableHead>
                    <TableHead className="w-1/6">Matched</TableHead>
                    <TableHead className="w-1/6">Discrepancies</TableHead>
                    <TableHead className="w-1/6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="truncate-title" title="Dec Orders vs Settlements">Dec Orders vs Settlements</TableCell>
                    <TableCell>Orders → Settlements</TableCell>
                    <TableCell className="text-right text-green-600">1,142</TableCell>
                    <TableCell className="text-right text-red-600">23</TableCell>
                    <TableCell>
                      <Badge variant="success">Completed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="Nov COD vs Remittances">Nov COD vs Remittances</TableCell>
                    <TableCell>COD → Remittances</TableCell>
                    <TableCell className="text-right text-green-600">867</TableCell>
                    <TableCell className="text-right text-red-600">12</TableCell>
                    <TableCell>
                      <Badge variant="success">Completed</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="Oct Freight Reconciliation">Oct Freight Reconciliation</TableCell>
                    <TableCell>Orders → Freight</TableCell>
                    <TableCell className="text-right text-green-600">412</TableCell>
                    <TableCell className="text-right text-red-600">8</TableCell>
                    <TableCell>
                      <Badge variant="warning">Running</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending items row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Match Reviews</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/match-review">Review all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-48">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="truncate-title" title="ORD-2024-1128">ORD-2024-1128</TableCell>
                    <TableCell className="text-right">Amazon</TableCell>
                    <TableCell className="text-right">₹2,499</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">Low confidence</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="ORD-2024-1135">ORD-2024-1135</TableCell>
                    <TableCell className="text-right">Flipkart</TableCell>
                    <TableCell className="text-right">₹1,850</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">Medium confidence</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/claims">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-48">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="truncate-title" title="CLM-A1B2C3D4">CLM-A1B2C3D4</TableCell>
                    <TableCell className="text-right">Amazon</TableCell>
                    <TableCell className="text-right text-green-600">₹3,200</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">Submitted</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="truncate-title" title="CLM-E5F6G7H8">CLM-E5F6G7H8</TableCell>
                    <TableCell className="text-right">Meesho</TableCell>
                    <TableCell className="text-right text-green-600">₹1,450</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">Under Review</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
