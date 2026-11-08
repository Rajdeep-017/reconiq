'use client'

import { useState } from 'react'
import { useDashboard } from '@/hooks/useDashboard'
import {
  useSettlementTrends,
  useMatchingTrends,
  usePartnerPerformance,
  usePartnerDiscrepancies,
} from '@/hooks/useAnalytics'
import { formatCurrencyINR } from '@/lib/utils'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import {
  LayoutDashboard, AlertCircle, FileText,
  TrendingUp, Coins, CheckCircle, RefreshCw, ExternalLink
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { extractErrorMessage } from '@/lib/api'

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
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
      <div className="flex items-center gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </div>
      <div className="p-2 rounded-lg bg-secondary/50 text-primary">
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
      </div>
      {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
      {trend && (
        <p className={`text-xs mt-1.5 font-medium ${trend.positive ? 'text-green-600' : 'text-amber-600'}`}>
          {trend.label}
        </p>
      )}
    </CardContent>
  </Card>
)

export function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard()
  const [dateRange, setDateRange] = useState('30d')

  const daysForRange = (range: string) => {
    switch (range) {
      case '7d':
        return 7
      case '90d':
        return 90
      case '1y':
        return 365
      default:
        return 30
    }
  }

  const weeksForRange = (range: string) => {
    switch (range) {
      case '7d':
        return 1
      case '90d':
        return 13
      case '1y':
        return 52
      default:
        return 4
    }
  }

  const { data: settlementTrends, isLoading: settlementLoading } = useSettlementTrends({
    days: daysForRange(dateRange),
  })
  const { data: matchingTrends, isLoading: matchingLoading } = useMatchingTrends({
    weeks: weeksForRange(dateRange),
  })
  const { data: partnerPerformance, isLoading: partnerLoading } = usePartnerPerformance()
  const { data: partnerDiscrepancies, isLoading: discrepanciesLoading } = usePartnerDiscrepancies()

  const analyticsLoading =
    settlementLoading || matchingLoading || partnerLoading || discrepanciesLoading

  if (isLoading || analyticsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="h-48">
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
      <Alert variant="destructive" onRetry={refetch} retryLabel="Retry">
        <AlertTitle>Failed to load dashboard</AlertTitle>
        <AlertDescription>{extractErrorMessage(error)}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return (
      <Alert variant="info">
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          Dashboard metrics could not be loaded. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const metrics = data

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">
            Monitor settlements, reconciliation performance and financial discrepancies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as string)}
            >
              <Select.Trigger className="w-full min-w-[200px]">
                <Select.Value placeholder={dateRange} />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="7d">Last 7 days</Select.Item>
                <Select.Item value="30d">Last 30 days</Select.Item>
                <Select.Item value="90d">Last 90 days</Select.Item>
                <Select.Item value="1y">Last year</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <Button
            onClick={() => refetch()}
            size="sm"
            className="flex items-center gap-2"
          >
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </span>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="#">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              <span>Export</span>
            </a>
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
          trend={{ label: 'Needs review', positive: metrics.unmatched_orders === 0 }}
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
          title="Pending Claims"
          value={metrics.active_claims.toLocaleString()}
          subtitle="Ready for review"
          icon={FileText}
          trend={{ label: 'Recovery potential', positive: Number(metrics.verified_claimable) > 0 }}
        />
      </div>

      {/* Analytics Section */}
      <Separator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlement Trend */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Settlement Trend</CardTitle>
            <CardDescription>Expected vs received settlement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full">
              {settlementTrends && settlementTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={settlementTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      itemStyle={{ color: '#172033', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="top" align="right" />
                    <Line type="monotone" dataKey="expected" stroke="#2563eb" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="received" stroke="#16a34a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No settlement data for the selected range.
                </div>
              )}
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
            <div className="h-[320px] w-full">
              {matchingTrends && matchingTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={matchingTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      itemStyle={{ color: '#172033', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="top" align="right" />
                    <Bar dataKey="matched" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unmatched" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No matching data for the selected range.
                </div>
              )}
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
            <div className="h-[320px] w-full">
              {partnerPerformance && partnerPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={partnerPerformance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis label={{ value: 'Match Rate (%)', angle: -90, position: 'insideLeft' }} stroke="#e2e8f0" tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      itemStyle={{ color: '#172033', fontWeight: 600 }}
                    />
                    <Bar dataKey="rate" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No partner performance data available.
                </div>
              )}
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
            <div className="h-[320px] w-full">
              {partnerDiscrepancies && partnerDiscrepancies.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={partnerDiscrepancies}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        itemStyle={{ color: '#172033', fontWeight: 600 }}
                      />
                      <Legend verticalAlign="top" align="right" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  No discrepancy data available.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Section */}
      <Separator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Uploads */}
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/uploads">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[240px]">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Recent Reconciliation Runs</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/reconciliation">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[240px]">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Pending Match Reviews</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/match-review">Review all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[192px]">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/claims">View all</a>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[192px]">
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
