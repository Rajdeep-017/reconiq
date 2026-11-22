import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Scale,
  TrendingUp,
} from 'lucide-react'
import { usePublicOverview } from '@/hooks/usePublicOverview'
import { formatCurrencyINR } from '@/lib/utils'
import {
  CategoryDonut,
  LANDING_CHART_COLORS,
  MiniStat,
  PanelShell,
  PanelSkeleton,
  PreviewError,
  TrendChart,
  formatCompactINR,
  formatCount,
} from '@/components/landing/PreviewPrimitives'

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-electric-300/20 bg-electric-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-electric-300">
      Demo
    </span>
  )
}

export function DashboardPreview() {
  const { data, isLoading, error, refetch } = usePublicOverview()

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <PreviewError onRetry={() => void refetch()} />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr_0.9fr] lg:items-end" role="status" aria-live="polite">
        <span className="sr-only">Loading product preview</span>
        {[0, 1, 2].map((index) => (
          <div key={index} className="landing-glass rounded-2xl p-5">
            <PanelSkeleton lines={index === 1 ? 5 : 4} />
          </div>
        ))}
      </div>
    )
  }

  const { overview, settlement, discrepancies, claims, trend } = data
  const actualRatio =
    settlement.expected_amount > 0
      ? Math.min(100, Math.max(0, (settlement.actual_amount / settlement.expected_amount) * 100))
      : 0
  const differenceLabel = `${settlement.difference < 0 ? '−' : '+'}${formatCompactINR(
    Math.abs(settlement.difference)
  )}`

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-full max-w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-electric-500/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr_0.9fr] lg:items-end lg:gap-5">
        {/* Left panel — reconciliation overview */}
        <div className="lg:translate-y-8">
          <div className="landing-float">
            <PanelShell
              title="Reconciliation Overview"
              subtitle="All financial streams"
              icon={Activity}
              badge={<DemoBadge />}
              className="landing-card-hover"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-white/35 sm:text-[10px] sm:tracking-[0.14em]">
                    Total transactions
                  </p>
                  <p className="mt-1 font-display text-[1.75rem] font-semibold leading-none tracking-tight text-white">
                    {formatCount(overview.total_transactions)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                  {overview.matching_rate.toFixed(1)}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat
                  label="Matched"
                  value={formatCount(overview.matched_transactions)}
                  tone="cyan"
                />
                <MiniStat
                  label="Pending"
                  value={formatCount(overview.pending_transactions)}
                  tone="amber"
                />
              </div>

              <div className="mt-3">
                <TrendChart data={trend} height={104} />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-white/45">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                  {overview.reconciliation_status}
                </span>
                <span className="text-[10px] text-white/30">Last 7 days</span>
              </div>
            </PanelShell>
          </div>
        </div>

        {/* Center panel — settlement reconciliation */}
        <div className="relative z-10 lg:-translate-y-3">
          <div className="landing-float landing-float-delayed">
            <PanelShell
              title="Settlement Reconciliation"
              subtitle="Expected vs received"
              icon={Scale}
              badge={
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">
                  <AlertCircle className="h-2.5 w-2.5" aria-hidden="true" />
                  Review
                </span>
              }
              className="landing-glass-strong landing-card-hover"
              bodyClassName="mt-5"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">
                  Settlement amount
                </p>
                <p className="mt-1.5 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[2.35rem]">
                  {formatCurrencyINR(settlement.settlement_amount)}
                </p>
                <p className="mt-2 text-[11px] text-white/40">
                  {settlement.processing_state} · {settlement.status}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 min-[360px]:grid-cols-2 sm:grid-cols-3 min-[360px]:[&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
                <MiniStat
                  label="Expected"
                  value={formatCompactINR(settlement.expected_amount)}
                  tone="muted"
                />
                <MiniStat
                  label="Actual"
                  value={formatCompactINR(settlement.actual_amount)}
                  tone="cyan"
                />
                <MiniStat label="Difference" value={differenceLabel} tone="amber" />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>Received against expected</span>
                  <span className="tabular-nums text-white/65">{actualRatio.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-electric-500 via-electric-400 to-electric-300 shadow-[0_0_14px_rgba(56,189,248,0.55)]"
                    style={{ width: `${actualRatio}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Processing complete
                </span>
                <span className="flex items-center gap-1 text-[10px] text-white/35">
                  Human review
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </div>
            </PanelShell>
          </div>
        </div>

        {/* Right panel — discrepancy overview */}
        <div className="lg:translate-y-8">
          <div className="landing-float landing-float-slow">
            <PanelShell
              title="Discrepancy Overview"
              subtitle="Open review queue"
              icon={AlertCircle}
              badge={
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-300">
                  {formatCount(discrepancies.open)} open
                </span>
              }
              className="landing-card-hover"
            >
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Open" value={formatCount(discrepancies.open)} tone="amber" />
                <MiniStat
                  label="Review"
                  value={formatCount(discrepancies.under_review)}
                  tone="cyan"
                />
                <MiniStat
                  label="Resolved"
                  value={formatCount(discrepancies.resolved)}
                  tone="green"
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                <CategoryDonut
                  categories={discrepancies.categories}
                  centerValue={formatCount(discrepancies.open)}
                  centerLabel="Open"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  {discrepancies.categories.slice(0, 4).map((category, index) => (
                    <div
                      key={category.category}
                      className="flex items-center justify-between gap-2 text-[10px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-white/55">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: LANDING_CHART_COLORS[index],
                          }}
                        />
                        <span className="truncate">{category.category}</span>
                      </span>
                      <span className="tabular-nums text-white/65">{category.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.07] pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-white/45">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {formatCount(claims.total)} claims tracked
                </span>
                <span className="text-[10px] font-medium text-emerald-300">
                  {formatCompactINR(claims.recovered_amount)} recovered
                </span>
              </div>
            </PanelShell>
          </div>
        </div>
      </div>

      <div className="relative mt-8 flex flex-col items-center gap-1.5 px-2 text-center lg:mt-14">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
          <span className="h-1.5 w-1.5 rounded-full bg-electric-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
          Product demonstration · illustrative data
        </span>
        <p className="max-w-xl text-[10px] leading-relaxed text-white/40">{data.disclaimer}</p>
      </div>
    </div>
  )
}
