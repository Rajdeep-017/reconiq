import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Scale,
  Wallet,
} from 'lucide-react'
import { usePublicOverview } from '@/hooks/usePublicOverview'
import { formatCurrencyINR } from '@/lib/utils'
import type { PublicOverview } from '@/types/landing'
import { Reveal } from '@/components/landing/Reveal'
import { SectionHeading } from '@/components/landing/SectionHeading'
import {
  CategoryDonut,
  LANDING_CHART_COLORS,
  PanelShell,
  PanelSkeleton,
  PreviewError,
  TrendChart,
  formatCompactINR,
  formatCount,
} from '@/components/landing/PreviewPrimitives'

type TabId = 'overview' | 'reconciliation' | 'discrepancies' | 'claims'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'reconciliation', label: 'Reconciliation' },
  { id: 'discrepancies', label: 'Discrepancies' },
  { id: 'claims', label: 'Claims' },
]

function Kpi({
  label,
  value,
  hint,
  tone = 'text-white',
}: {
  label: string
  value: string
  hint?: string
  tone?: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[9px] uppercase tracking-[0.1em] text-white/35 sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
      <p className={`mt-2 font-display text-xl font-semibold tracking-tight ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-white/30">{hint}</p>}
    </div>
  )
}

export function ProductShowcase() {
  const { data, isLoading, error, refetch } = usePublicOverview()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const supported = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!supported.includes(event.key)) return
    event.preventDefault()

    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1

    setActiveTab(TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <section id="showcase" className="landing-section">
      <div className="landing-container">
        <Reveal>
          <SectionHeading
            eyebrow="Product showcase"
            title="A closer look at the reconciliation workspace."
            description="Explore the same core views finance teams use to reconcile reports, review exceptions and track claims. This public preview is a clearly labelled product demonstration."
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="landing-glass-strong mt-10 overflow-hidden rounded-3xl">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/70" />
                </span>
                <span className="ml-2 text-[11px] font-medium text-white/45">
                  ReconIQ workspace
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-electric-300/20 bg-electric-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-electric-300 sm:self-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-electric-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                Demo preview
              </span>
            </div>

            <div className="border-b border-white/[0.07] px-3 py-3 sm:px-5">
              <div
                className="landing-scrollbar grid grid-cols-2 gap-1 sm:flex sm:gap-1"
                role="tablist"
                aria-label="Product preview tabs"
              >
                {TABS.map((tab, index) => (
                  <button
                    key={tab.id}
                    ref={(node) => {
                      tabRefs.current[index] = node
                    }}
                    type="button"
                    role="tab"
                    id={`showcase-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`showcase-panel-${tab.id}`}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                    className="landing-tab w-full rounded-full px-3 py-2 text-[11px] font-medium sm:w-auto sm:px-3.5"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="landing-preview-grid p-4 sm:p-5">
              {error ? (
                <PreviewError onRetry={() => void refetch()} />
              ) : isLoading || !data ? (
                <div
                  className="landing-glass rounded-2xl p-5"
                  role="status"
                  aria-live="polite"
                >
                  <span className="sr-only">Loading product preview</span>
                  <PanelSkeleton lines={7} />
                </div>
              ) : (
                <>
                  <div
                    id="showcase-panel-overview"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="showcase-tab-overview"
                    hidden={activeTab !== 'overview'}
                  >
                    <OverviewTab data={data} />
                  </div>
                  <div
                    id="showcase-panel-reconciliation"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="showcase-tab-reconciliation"
                    hidden={activeTab !== 'reconciliation'}
                  >
                    <ReconciliationTab data={data} />
                  </div>
                  <div
                    id="showcase-panel-discrepancies"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="showcase-tab-discrepancies"
                    hidden={activeTab !== 'discrepancies'}
                  >
                    <DiscrepanciesTab data={data} />
                  </div>
                  <div
                    id="showcase-panel-claims"
                    role="tabpanel"
                    tabIndex={0}
                    aria-labelledby="showcase-tab-claims"
                    hidden={activeTab !== 'claims'}
                  >
                    <ClaimsTab data={data} />
                  </div>
                </>
              )}
            </div>

            {data && (
              <div className="border-t border-white/[0.07] px-4 py-3 sm:px-5">
                <p className="text-[10px] leading-relaxed text-white/40">{data.disclaimer}</p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function OverviewTab({ data }: { data: PublicOverview }) {
  const { overview, trend } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total transactions" value={formatCount(overview.total_transactions)} />
        <Kpi
          label="Matched"
          value={formatCount(overview.matched_transactions)}
          tone="text-electric-300"
        />
        <Kpi
          label="Pending"
          value={formatCount(overview.pending_transactions)}
          tone="text-amber-300"
        />
        <Kpi
          label="Matching rate"
          value={`${overview.matching_rate.toFixed(1)}%`}
          tone="text-emerald-300"
        />
      </div>

      <PanelShell
        title="Reconciliation trend"
        subtitle="Matched vs pending transactions"
        icon={Activity}
        badge={
          <span className="text-[9px] uppercase tracking-[0.12em] text-white/30">Last 7 days</span>
        }
      >
        <TrendChart data={trend} height={170} />
      </PanelShell>
    </div>
  )
}

function ReconciliationTab({ data }: { data: PublicOverview }) {
  const { settlement, matching_breakdown } = data
  const totalBreakdown = matching_breakdown.reduce((sum, item) => sum + item.count, 0)
  const actualRatio =
    settlement.expected_amount > 0
      ? Math.min(100, Math.max(0, (settlement.actual_amount / settlement.expected_amount) * 100))
      : 0
  const differenceLabel = `${settlement.difference < 0 ? '−' : '+'}${formatCompactINR(
    Math.abs(settlement.difference)
  )}`

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <PanelShell
        title="Settlement reconciliation"
        subtitle="Expected vs received"
        icon={Scale}
        badge={
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-medium text-amber-300">
            {settlement.status}
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 min-[360px]:[&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <Kpi label="Expected" value={formatCompactINR(settlement.expected_amount)} />
          <Kpi
            label="Actual"
            value={formatCompactINR(settlement.actual_amount)}
            tone="text-electric-300"
          />
          <Kpi label="Difference" value={differenceLabel} tone="text-amber-300" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>Received against expected</span>
            <span className="tabular-nums text-white/65">{actualRatio.toFixed(1)}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric-500 via-electric-400 to-electric-300"
              style={{ width: `${actualRatio}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          <span className="text-[11px] text-white/55">
            {settlement.processing_state} · human review required before resolution
          </span>
        </div>
      </PanelShell>

      <PanelShell
        title="Matching breakdown"
        subtitle="How records were resolved"
        icon={ArrowRight}
      >
        <div className="space-y-4">
          {matching_breakdown.map((item, index) => {
            const width = totalBreakdown > 0 ? (item.count / totalBreakdown) * 100 : 0
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-white/55">{item.label}</span>
                  <span className="tabular-nums text-white/65">{formatCount(item.count)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${
                      index === 0
                        ? 'bg-electric-300'
                        : index === 1
                          ? 'bg-electric-500'
                          : 'bg-amber-300'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <p className="text-[10px] leading-relaxed text-white/40">
            Matching outcomes are deterministic and persisted. Review decisions remain explicit.
          </p>
        </div>
      </PanelShell>
    </div>
  )
}

function DiscrepanciesTab({ data }: { data: PublicOverview }) {
  const { discrepancies, claims } = data

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <PanelShell
        title="Discrepancy overview"
        subtitle="Open review queue"
        icon={AlertCircle}
        badge={
          <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-medium text-amber-300">
            {formatCount(discrepancies.open)} open
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 min-[360px]:[&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <Kpi label="Open" value={formatCount(discrepancies.open)} tone="text-amber-300" />
          <Kpi
            label="Under review"
            value={formatCount(discrepancies.under_review)}
            tone="text-electric-300"
          />
          <Kpi label="Resolved" value={formatCount(discrepancies.resolved)} tone="text-emerald-300" />
        </div>

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
          <CategoryDonut
            categories={discrepancies.categories}
            centerValue={formatCount(discrepancies.open)}
            centerLabel="Open"
          />
          <div className="w-full space-y-2.5">
            {discrepancies.categories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[11px] text-white/55">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: LANDING_CHART_COLORS[index],
                    }}
                  />
                  {category.category}
                </span>
                <span className="tabular-nums text-[11px] text-white/65">{category.count}</span>
              </div>
            ))}
          </div>
        </div>
      </PanelShell>

      <PanelShell title="Claims overview" subtitle="Recovery pipeline" icon={FileCheck2}>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">Recovered amount</p>
          <p className="mt-2 font-display text-2xl font-semibold text-emerald-300">
            {formatCompactINR(claims.recovered_amount)}
          </p>
          <p className="mt-1 text-[10px] text-white/30">{formatCount(claims.total)} claims tracked</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kpi label="Draft" value={formatCount(claims.draft)} />
          <Kpi label="Submitted" value={formatCount(claims.submitted)} tone="text-electric-300" />
          <Kpi
            label="Under review"
            value={formatCount(claims.under_review)}
            tone="text-amber-300"
          />
          <Kpi label="Resolved" value={formatCount(claims.resolved)} tone="text-emerald-300" />
        </div>
      </PanelShell>
    </div>
  )
}

function ClaimsTab({ data }: { data: PublicOverview }) {
  const { claims } = data
  const stages = [
    { label: 'Draft', value: claims.draft, color: 'bg-white/25' },
    { label: 'Submitted', value: claims.submitted, color: 'bg-electric-400' },
    { label: 'Under review', value: claims.under_review, color: 'bg-amber-300' },
    { label: 'Resolved', value: claims.resolved, color: 'bg-emerald-300' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <PanelShell title="Claim recovery" subtitle="Human-controlled lifecycle" icon={Wallet}>
        <div className="rounded-2xl border border-electric-300/15 bg-gradient-to-br from-electric-500/15 to-transparent p-5">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">Recovered amount</p>
          <p className="mt-2 font-display text-[1.4rem] font-semibold tracking-tight text-white sm:text-3xl">
            {formatCurrencyINR(claims.recovered_amount)}
          </p>
          <p className="mt-2 text-[11px] text-white/50">
            Across {formatCount(claims.total)} tracked claims
          </p>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <p className="text-[10px] leading-relaxed text-white/50">
            Claims are created from persisted discrepancies. Resolution and closure remain explicit
            human decisions.
          </p>
        </div>
      </PanelShell>

      <PanelShell title="Claim pipeline" subtitle="Status distribution" icon={FileCheck2}>
        <div className="space-y-4">
          {stages.map((stage) => {
            const width = claims.total > 0 ? (stage.value / claims.total) * 100 : 0
            return (
              <div key={stage.label}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-white/45">{stage.label}</span>
                  <span className="tabular-nums text-white/65">{formatCount(stage.value)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${stage.color}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <p className="text-[10px] leading-relaxed text-white/40">
            The lifecycle runs from draft through submitted, acknowledged, under review, resolved or
            rejected, and closed.
          </p>
        </div>
      </PanelShell>
    </div>
  )
}
