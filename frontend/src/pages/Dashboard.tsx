'use client'

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyDataState } from '@/components/EmptyDataState'
import { useDashboard } from '@/hooks/useDashboard'
import { useUploads } from '@/hooks/useUploads'
import { useReconciliationRuns } from '@/hooks/useReconciliation'
import { useDiscrepancies } from '@/hooks/useDiscrepancies'
import { useClaims } from '@/hooks/useClaims'
import { useSettlementTrends, useMatchingTrends, usePartnerPerformance, usePartnerDiscrepancies } from '@/hooks/useAnalytics'
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
  TrendingUp, Coins, CheckCircle, RefreshCw
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

const uploadStatusBadge = (status: string) => {
  switch (status) {
    case 'processed':
      return <Badge variant="success">Processed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'mapped':
      return <Badge variant="warning">Mapped</Badge>
    case 'processing':
      return <Badge variant="warning">Processing</Badge>
    default:
      return <Badge variant="secondary">Parsed</Badge>
  }
}

const runStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    case 'running':
      return <Badge variant="warning">Running</Badge>
    default:
      return <Badge variant="secondary">Created</Badge>
  }
}

const discrepancyStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <Badge variant="success">Verified</Badge>
    case 'resolved':
      return <Badge variant="success">Resolved</Badge>
    case 'dismissed':
      return <Badge variant="secondary">Dismissed</Badge>
    case 'disputed':
      return <Badge variant="warning">Disputed</Badge>
    default:
      return <Badge variant="warning">Detected</Badge>
  }
}

const claimStatusBadge = (status: string) => {
  switch (status) {
    case 'submitted':
      return <Badge variant="info">Submitted</Badge>
    case 'acknowledged':
      return <Badge variant="warning">Acknowledged</Badge>
    case 'under_review':
      return <Badge variant="warning">Under Review</Badge>
    case 'resolved':
      return <Badge variant="success">Resolved</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>
    case 'closed':
      return <Badge variant="secondary">Closed</Badge>
    default:
      return <Badge variant="secondary">Draft</Badge>
  }
}

export function Dashboard() {
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

  const metricsQuery = useDashboard()
  const settlementQuery = useSettlementTrends({
    days: daysForRange(dateRange),
  })
  const matchingQuery = useMatchingTrends({
    weeks: weeksForRange(dateRange),
  })
  const partnerPerformanceQuery = usePartnerPerformance()
  const partnerDiscrepanciesQuery = usePartnerDiscrepancies()
  const uploadsQuery = useUploads({ page: 1, pageSize: 5 })
  const runsQuery = useReconciliationRuns()
  const discrepanciesQuery = useDiscrepancies({ page: 1, page_size: 5 })
  const claimsQuery = useClaims({ page: 1, page_size: 5 })

  const settlementTrends = settlementQuery.data
  const matchingTrends = matchingQuery.data
  const partnerPerformance = partnerPerformanceQuery.data
  const partnerDiscrepancies = partnerDiscrepanciesQuery.data
  const data = metricsQuery.data
  const queries = [
    metricsQuery,
    settlementQuery,
    matchingQuery,
    partnerPerformanceQuery,
    partnerDiscrepanciesQuery,
    uploadsQuery,
    runsQuery,
    discrepanciesQuery,
    claimsQuery,
  ]
  const isLoading = queries.some((query) => query.isLoading)
  const errorQuery = queries.find((query) => query.error)
  const retryAll = () => Promise.all(queries.map((query) => query.refetch()))

  if (isLoading) {
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

  if (errorQuery?.error) {
    return (
      <Alert variant="destructive" onRetry={() => void retryAll()} retryLabel="Retry">
        <AlertTitle>Failed to load dashboard</AlertTitle>
        <AlertDescription>{extractErrorMessage(errorQuery.error)}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return (
      <Alert
        variant="info"
        onRetry={() => void retryAll()}
        retryLabel="Retry"
      >
        <AlertTitle>No data available</AlertTitle>
        <AlertDescription>
          Dashboard metrics could not be loaded. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const metrics = data
  const uploads = uploadsQuery.data?.uploads ?? []
  const runs = (runsQuery.data ?? []).slice(0, 5)
  const discrepanciesList = (discrepanciesQuery.data ?? []).slice(0, 5)
  const claims = (claimsQuery.data ?? []).slice(0, 5)

  if ((uploadsQuery.data?.total ?? uploads.length) === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">
            Monitor settlements, reconciliation performance and financial discrepancies.
          </p>
        </div>
        <EmptyDataState
          title="No financial data yet"
          description="Upload a file to begin, then map its columns and run a reconciliation."
          actionLabel="Upload a file"
          to="/uploads"
        />
      </div>
    )
  }

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
            onClick={() => void retryAll()}
            size="sm"
            className="flex items-center gap-2"
          >
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </span>
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
          subtitle="Across completed runs"
          icon={Coins}
          trend={{ label: 'Total expected', positive: true }}
        />
        <KPICard
          title="Received Amount"
          value={formatCurrencyINR(metrics.total_received)}
          subtitle="Across completed runs"
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
          subtitle="Not closed or rejected"
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

      {/* Operational Section — live data */}
      <Separator />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/uploads">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {uploads.length === 0 ? (
              <EmptyDataState
                title="No uploads yet"
                description="Upload a file to begin tracking reconciliation activity."
                actionLabel="Upload a file"
                to="/uploads"
              />
            ) : (
              <div className="overflow-auto max-h-[240px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">File</TableHead>
                      <TableHead className="w-1/6">Type</TableHead>
                      <TableHead className="w-1/6">Rows</TableHead>
                      <TableHead className="w-1/6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="truncate-title" title={u.original_filename}>
                          {u.original_filename}
                        </TableCell>
                        <TableCell className="capitalize">
                          {u.document_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-right">{u.row_count ?? '—'}</TableCell>
                        <TableCell>{uploadStatusBadge(u.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Recent Reconciliation Runs</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reconciliation">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {runs.length === 0 ? (
              <EmptyDataState
                title="No reconciliation runs yet"
                description="Compare uploaded reports by creating a reconciliation run."
                actionLabel="Run reconciliation"
                to="/reconciliation"
              />
            ) : (
              <div className="overflow-auto max-h-[240px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Run</TableHead>
                      <TableHead className="w-1/6">Matched</TableHead>
                      <TableHead className="w-1/6">Discrepancies</TableHead>
                      <TableHead className="w-1/6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="truncate-title" title={r.name}>
                          {r.name}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {r.status === 'completed' ? r.matched_count.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {r.status === 'completed' ? r.discrepancy_count.toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>{runStatusBadge(r.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Latest Discrepancies</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/discrepancies">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {discrepanciesList.length === 0 ? (
              <EmptyDataState
                title="No discrepancies yet"
                description="Run a reconciliation to identify potential discrepancies."
                actionLabel="Run reconciliation"
                to="/reconciliation"
              />
            ) : (
              <div className="overflow-auto max-h-[192px]">
                <Table>
                  <TableBody>
                    {discrepanciesList.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="truncate-title" title={d.order_reference}>
                          {d.order_reference}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{Number(d.difference_amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          {discrepancyStatusBadge(String(d.status))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Latest Claims</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/claims">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {claims.length === 0 ? (
              <EmptyDataState
                title="No claims yet"
                description="Run a reconciliation to find claimable discrepancies."
                actionLabel="Run reconciliation"
                to="/reconciliation"
              />
            ) : (
              <div className="overflow-auto max-h-[192px]">
                <Table>
                  <TableBody>
                    {claims.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="truncate-title" title={c.claim_reference}>
                          {c.claim_reference}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrencyINR(c.claim_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {claimStatusBadge(String(c.status))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
