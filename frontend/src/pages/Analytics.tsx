'use client'

import { useState } from 'react'
import { EmptyDataState } from '@/components/EmptyDataState'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts'
import {
  useSettlementTrends,
  usePartnerPerformance,
  usePartnerDiscrepancies,
  useFreightOvercharge,
  useCODRemittance,
  useReturnRefund,
  useClaimRecovery,
  useMonthWise,
} from '@/hooks/useAnalytics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw } from 'lucide-react'
import { extractErrorMessage } from '@/lib/api'

function EmptyChart({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-sm">No data for {title}</p>
    </div>
  )
}

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

export function Analytics() {
  const [dateRange, setDateRange] = useState('30d')
  const days = daysForRange(dateRange)

  const settlementQuery = useSettlementTrends({ days })
  const partnerPerformanceQuery = usePartnerPerformance()
  const partnerDiscrepanciesQuery = usePartnerDiscrepancies()
  const freightOverchargeQuery = useFreightOvercharge()
  const codRemittanceQuery = useCODRemittance({ days })
  const returnRefundQuery = useReturnRefund()
  const claimRecoveryQuery = useClaimRecovery({ days })
  const monthWiseQuery = useMonthWise()

  const settlementTrends = settlementQuery.data
  const partnerPerformance = partnerPerformanceQuery.data
  const partnerDiscrepancies = partnerDiscrepanciesQuery.data
  const freightOvercharge = freightOverchargeQuery.data
  const codRemittance = codRemittanceQuery.data
  const returnRefund = returnRefundQuery.data
  const claimRecovery = claimRecoveryQuery.data
  const monthWise = monthWiseQuery.data
  const analyticsQueries = [
    settlementQuery,
    partnerPerformanceQuery,
    partnerDiscrepanciesQuery,
    freightOverchargeQuery,
    codRemittanceQuery,
    returnRefundQuery,
    claimRecoveryQuery,
    monthWiseQuery,
  ]

  const isLoading = analyticsQueries.some((query) => query.isLoading)
  const errorQuery = analyticsQueries.find((query) => query.error)
  const hasData = [
    settlementTrends,
    partnerPerformance,
    partnerDiscrepancies,
    freightOvercharge,
    codRemittance,
    returnRefund,
    claimRecovery,
    monthWise,
  ].some((items) => (items?.length ?? 0) > 0)
  const retryAll = () => Promise.all(analyticsQueries.map((query) => query.refetch()))

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Data-driven financial analytics for reconciliation performance.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-72">
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (errorQuery?.error) {
    return (
      <Alert
        variant="destructive"
        onRetry={() => void retryAll()}
        retryLabel="Retry"
      >
        <AlertTitle>Failed to load analytics</AlertTitle>
        <AlertDescription>{extractErrorMessage(errorQuery.error)}</AlertDescription>
      </Alert>
    )
  }

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
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as string)}>
            <Select.Trigger className="w-[160px]">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="7d">Last 7 days</Select.Item>
              <Select.Item value="30d">Last 30 days</Select.Item>
              <Select.Item value="90d">Last 90 days</Select.Item>
              <Select.Item value="1y">Last year</Select.Item>
            </Select.Content>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void retryAll()} className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Date range applies to settlement trends, COD remittance and claim recovery charts; partner
        and other aggregates always cover all data.
      </p>
      {!hasData && (
        <EmptyDataState
          title="No analytics data yet"
          description="Upload your reports and run a reconciliation to populate these charts."
          actionLabel="Upload a file"
          to="/uploads"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Settlement trends */}
        <Card>
          <CardHeader>
            <CardTitle>Settlement Trends Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {settlementTrends && settlementTrends.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={settlementTrends}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expected"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="received"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="settlement trends" />
            )}
          </CardContent>
        </Card>

        {/* 2. Partner matching rates */}
        <Card>
          <CardHeader>
            <CardTitle>Partner-wise Matching Rates</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerPerformance && partnerPerformance.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={partnerPerformance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Match Rate (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="partner matching rates" />
            )}
          </CardContent>
        </Card>

        {/* 3. Partner discrepancy values */}
        <Card>
          <CardHeader>
            <CardTitle>Partner-wise Discrepancy Values</CardTitle>
          </CardHeader>
          <CardContent>
            {partnerDiscrepancies && partnerDiscrepancies.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={partnerDiscrepancies}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Discrepancy Value (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="partner discrepancies" />
            )}
          </CardContent>
        </Card>

        {/* 4. Freight overcharge */}
        <Card>
          <CardHeader>
            <CardTitle>Freight Overcharge Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {freightOvercharge && freightOvercharge.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={freightOvercharge}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Overcharge (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Bar dataKey="overcharge" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="freight overcharge" />
            )}
          </CardContent>
        </Card>

        {/* 5. COD remittance */}
        <Card>
          <CardHeader>
            <CardTitle>COD Remittance Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {codRemittance && codRemittance.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={codRemittance}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="collected"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="remitted"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="COD remittance" />
            )}
          </CardContent>
        </Card>

        {/* 6. Return/refund discrepancy */}
        <Card>
          <CardHeader>
            <CardTitle>Return/Refund Discrepancy Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {returnRefund && returnRefund.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={returnRefund}
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
            ) : (
              <EmptyChart title="return/refund analysis" />
            )}
          </CardContent>
        </Card>

        {/* 7. Claim recovery trends */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Recovery Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {claimRecovery && claimRecovery.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={claimRecovery}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis
                      label={{ value: 'Recovered (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="recovered"
                      fill="#7c3aed"
                      stroke="#7c3aed"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="claim recovery" />
            )}
          </CardContent>
        </Card>

        {/* 8. Month-wise reconciliation */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Month-wise Reconciliation Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {monthWise && monthWise.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthWise}
                    margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Orders', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="matched" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="unmatched" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart title="month-wise performance" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
