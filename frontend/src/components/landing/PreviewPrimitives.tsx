import { useId, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react'
import { cn, formatCurrencyINR } from '@/lib/utils'
import type { PublicDiscrepancyCategory, PublicTrendPoint } from '@/types/landing'

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

export function formatCompactINR(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)}Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)}L`
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`
  return formatCurrencyINR(value)
}

export const LANDING_CHART_COLORS = [
  '#38BDF8',
  '#2563FF',
  '#7C3AED',
  '#22C55E',
  '#F59E0B',
] as const

interface PanelShellProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  badge?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function PanelShell({
  title,
  subtitle,
  icon: Icon,
  badge,
  children,
  className,
  bodyClassName,
}: PanelShellProps) {
  return (
    <div className={cn('landing-glass rounded-2xl p-4 sm:p-5', className)}>
      <div className="flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-start min-[360px]:justify-between min-[360px]:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-electric-300">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-snug text-white">{title}</p>
            {subtitle && <p className="truncate text-[10px] text-white/40">{subtitle}</p>}
          </div>
        </div>
        <div className="shrink-0 self-start min-[360px]:self-auto">{badge}</div>
      </div>
      <div className={cn('mt-4', bodyClassName)}>{children}</div>
    </div>
  )
}

type StatTone = 'blue' | 'cyan' | 'green' | 'amber' | 'muted'

const statToneClasses: Record<StatTone, string> = {
  blue: 'text-electric-400',
  cyan: 'text-electric-300',
  green: 'text-emerald-300',
  amber: 'text-amber-300',
  muted: 'text-white/55',
}

export function MiniStat({
  label,
  value,
  tone = 'muted',
  valueClassName,
}: {
  label: string
  value: string
  tone?: StatTone
  valueClassName?: string
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.1em] text-white/35 sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold tabular-nums', statToneClasses[tone], valueClassName)}>
        {value}
      </p>
    </div>
  )
}

interface TrendChartProps {
  data: PublicTrendPoint[]
  height?: number
}

export function TrendChart({ data, height = 110 }: TrendChartProps) {
  const rawId = useId()
  const gradientId = `landing-trend-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div style={{ height }} className="w-full" aria-label="Reconciliation trend chart" role="img">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#2563FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#7f8ba8', fontSize: 9 }}
            padding={{ left: 12, right: 12 }}
            dy={6}
          />
          <YAxis hide domain={['dataMin - 1800', 'dataMax + 900']} />
          <Tooltip
            cursor={{ stroke: 'rgba(126,166,255,0.2)' }}
            contentStyle={{
              background: 'rgba(5,8,19,0.96)',
              border: '1px solid rgba(126,166,255,0.22)',
              borderRadius: 12,
              fontSize: 11,
              color: '#f4f7ff',
              boxShadow: '0 16px 40px -20px rgba(0,0,0,0.9)',
            }}
            labelStyle={{ color: '#8d9ab8', marginBottom: 4 }}
            formatter={(value, name) => [
              formatCount(Number(value)),
              name === 'matched' ? 'Matched' : 'Pending',
            ]}
          />
          <Area
            type="monotone"
            dataKey="matched"
            stroke="#38BDF8"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: '#38BDF8', stroke: '#03040B', strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="pending"
            stroke="#2563FF"
            strokeWidth={1.4}
            strokeDasharray="4 4"
            fill="transparent"
            dot={false}
            activeDot={{ r: 2.5, fill: '#2563FF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const DONUT_COLORS = LANDING_CHART_COLORS

interface CategoryDonutProps {
  categories: PublicDiscrepancyCategory[]
  centerValue: string
  centerLabel: string
}

export function CategoryDonut({ categories, centerValue, centerLabel }: CategoryDonutProps) {
  const total = categories.reduce((sum, category) => sum + category.count, 0)

  let cursor = 0
  const segments = categories.map((category, index) => {
    const start = cursor
    const end = total > 0 ? cursor + (category.count / total) * 100 : 0
    cursor = end
    return `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start}% ${end}%`
  })

  return (
    <div
      className="relative h-28 w-28 shrink-0 rounded-full"
      style={{
        background:
          total > 0
            ? `conic-gradient(${segments.join(', ')})`
            : 'conic-gradient(rgba(126,166,255,0.16) 0% 100%)',
      }}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}. ${categories
        .map((category) => `${category.category}: ${category.count}`)
        .join(', ')}`}
    >
      <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full border border-white/[0.06] bg-ink-900 text-center">
        <span className="text-lg font-semibold tabular-nums text-white">{centerValue}</span>
        <span className="text-[9px] uppercase tracking-[0.1em] text-white/40">{centerLabel}</span>
      </div>
    </div>
  )
}

export function PreviewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="landing-glass flex flex-col items-center justify-center rounded-2xl px-6 py-10 text-center" role="alert">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-amber-300">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-white">Product preview unavailable</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-white/50">
        We couldn&apos;t load the product demonstration. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-electric-300/40 hover:bg-electric-500/10"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Retry preview
      </button>
    </div>
  )
}

export function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-3 w-1/2 rounded bg-white/[0.07]" />
      <div className="h-8 w-2/3 rounded bg-white/[0.06]" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-2.5 rounded bg-white/[0.045]" />
      ))}
    </div>
  )
}
