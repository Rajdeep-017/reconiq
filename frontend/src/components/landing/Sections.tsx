import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  FileText,
  Layers3,
  Scale,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Users,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import { Reveal } from '@/components/landing/Reveal'
import { SectionHeading } from '@/components/landing/SectionHeading'
import { useAuth } from '@/hooks/useAuth'

const CAPABILITIES: {
  icon: LucideIcon
  title: string
  description: string
  tag: string
}[] = [
  {
    icon: Database,
    title: 'Financial data ingestion',
    description:
      'Upload CSV or XLSX reports for orders, settlements, COD remittances, freight invoices, returns and warehouse scans.',
    tag: 'CSV · XLSX',
  },
  {
    icon: SlidersHorizontal,
    title: 'Intelligent column mapping',
    description:
      'Rule-assisted suggestions map source columns to canonical fields, with an explicit review and approval step before processing.',
    tag: 'Review before commit',
  },
  {
    icon: Layers3,
    title: 'Data normalization',
    description:
      'Dates, amounts and references are normalized into consistent records so reports from different sources can be compared.',
    tag: 'Canonical records',
  },
  {
    icon: Scale,
    title: 'Settlement reconciliation',
    description:
      'Deterministic matching across settlement, COD, freight and return streams with clear expected-versus-received outcomes.',
    tag: 'Four stream engines',
  },
  {
    icon: AlertCircle,
    title: 'Discrepancy detection',
    description:
      'Surface short payments, missing settlements, COD gaps, freight overcharges and return mismatches with reviewable evidence.',
    tag: 'Explainable results',
  },
  {
    icon: FileCheck2,
    title: 'Claims management',
    description:
      'Turn confirmed discrepancies into draft claims, track their lifecycle and keep human approval explicit at every stage.',
    tag: 'Human approval',
  },
]

export function PlatformCapabilities() {
  return (
    <section id="platform" className="landing-section">
      <div className="landing-container">
        <Reveal>
          <SectionHeading
            eyebrow="Platform"
            title="One workspace for every financial stream."
            description="ReconIQ is built around the reports finance teams already work with — and the review steps they still need to control."
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((capability, index) => {
            const Icon = capability.icon
            return (
              <Reveal key={capability.title} delay={index * 60}>
                <article className="landing-glass landing-card-hover group h-full rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-300/15 bg-gradient-to-br from-electric-500/20 to-electric-300/5 text-electric-300">
                      <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
                    </span>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-white/35">
                      {capability.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-semibold text-white">{capability.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/55">
                    {capability.description}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5 text-[10px] font-medium text-electric-300/0 transition-colors duration-300 group-hover:text-electric-300/80">
                    Built into ReconIQ
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const FRAGMENTED_SOURCES = [
  { label: 'Marketplace reports', icon: Store },
  { label: 'Payment settlements', icon: Briefcase },
  { label: 'COD remittances', icon: ClipboardList },
  { label: 'Freight invoices', icon: FileText },
  { label: 'Returns & refunds', icon: Layers3 },
]

const UNIFIED_ROWS = [
  { label: 'Expected amount', status: 'Recorded', tone: 'text-white/55' },
  { label: 'Actual received', status: 'Matched', tone: 'text-emerald-300' },
  { label: 'Difference', status: 'Under review', tone: 'text-amber-300' },
  { label: 'Recovery', status: 'Claim tracked', tone: 'text-electric-300' },
]

export function ProblemSection() {
  return (
    <section id="problem" className="landing-section">
      <div className="landing-container">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="The reconciliation problem"
              title="Financial data is everywhere. Your visibility shouldn't be."
              description="Marketplace reports, payment gateway settlements, COD collections, shipping charges and returns all arrive in different formats. Rebuilding the truth in spreadsheets makes discrepancies easy to miss — and recoveries easy to lose."
            />
            <div className="mt-7 space-y-3">
              {[
                'Reports arrive with different columns, dates and reference formats.',
                'Manual checks are slow, repetitive and hard to audit.',
                'Missed short payments and unremitted COD quietly erode margin.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-xs leading-relaxed text-white/55">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <span className="h-1 w-1 rounded-full bg-electric-300" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-10 rounded-full bg-electric-500/15 blur-[80px]"
                aria-hidden="true"
              />
              <div className="landing-glass relative rounded-3xl p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[0.9fr_1.1fr] sm:items-center">
                  <div className="space-y-2">
                    {FRAGMENTED_SOURCES.map((source) => {
                      const Icon = source.icon
                      return (
                        <div
                          key={source.label}
                          className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/50">
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          <span className="text-[11px] text-white/55">{source.label}</span>
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-300/70" />
                        </div>
                      )
                    })}
                  </div>

                  <div className="relative rounded-2xl border border-electric-300/20 bg-gradient-to-b from-electric-500/15 to-ink-900/80 p-4 shadow-[0_24px_70px_-30px_rgba(37,99,255,0.65)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-electric-300">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        ReconIQ
                      </span>
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
                        One view
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {UNIFIED_ROWS.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-[10px] text-white/40">{row.label}</span>
                          <span className={`text-[10px] font-medium ${row.tone}`}>{row.status}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-electric-300" aria-hidden="true" />
                      <span className="text-[10px] text-white/45">
                        Auditable, human-reviewed outcomes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

const WORKFLOW_STEPS: {
  number: string
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    number: '01',
    title: 'Upload financial reports',
    description: 'Bring in the CSV or XLSX reports you already receive from your finance sources.',
    icon: Database,
  },
  {
    number: '02',
    title: 'Map and normalize data',
    description: 'Review suggested column mappings and normalize records before processing.',
    icon: Wand2,
  },
  {
    number: '03',
    title: 'Match financial transactions',
    description: 'Run deterministic matching for settlement, COD, freight or return streams.',
    icon: Scale,
  },
  {
    number: '04',
    title: 'Detect and review discrepancies',
    description: 'Inspect explained outcomes, verify exceptions and keep review decisions explicit.',
    icon: AlertCircle,
  },
  {
    number: '05',
    title: 'Track claims and reports',
    description: 'Turn confirmed discrepancies into claims and follow recovery through its lifecycle.',
    icon: FileCheck2,
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From scattered reports to a reviewable reconciliation flow."
            description="Five deliberate steps. No automatic approvals, no hidden calculations."
          />
        </Reveal>

        <Reveal className="landing-workflow relative mt-12" delay={100}>
          <div
            className="landing-workflow-line absolute left-[10%] right-[10%] top-[2.15rem] hidden h-px bg-gradient-to-r from-electric-500/10 via-electric-300/60 to-electric-500/10 lg:block"
            aria-hidden="true"
          />
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <li key={step.number} className="relative">
                  <div className="landing-glass landing-card-hover h-full rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-electric-300/20 bg-electric-500/10 text-electric-300">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-display text-[11px] font-semibold tracking-[0.12em] text-white/25">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[13px] font-semibold leading-snug text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                      {step.description}
                    </p>
                  </div>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="mx-auto h-4 w-px bg-gradient-to-b from-electric-300/30 to-transparent sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}

const SOLUTIONS: {
  icon: LucideIcon
  title: string
  description: string
  points: string[]
}[] = [
  {
    icon: ShoppingBag,
    title: 'D2C brands',
    description:
      'Keep every order, settlement and return in one reconciliation flow as you scale across channels.',
    points: ['Order-to-settlement checks', 'COD and return visibility', 'Recovery tracking'],
  },
  {
    icon: Users,
    title: 'E-commerce finance teams',
    description:
      'Replace recurring spreadsheet checks with a repeatable workflow and a shared review queue.',
    points: ['Consistent monthly close', 'Discrepancy ownership', 'Auditable decisions'],
  },
  {
    icon: Briefcase,
    title: 'Finance executives',
    description:
      'See expected versus received, open exceptions and claim recovery without chasing separate reports.',
    points: ['Single financial view', 'Exception prioritization', 'Claim lifecycle oversight'],
  },
  {
    icon: Store,
    title: 'Business owners',
    description:
      'Understand where money is stuck, what needs review and which recoveries are already in motion.',
    points: ['Clear recovery status', 'No hidden calculations', 'Human-controlled approvals'],
  },
]

export function SolutionsSection() {
  return (
    <section id="solutions" className="landing-section">
      <div className="landing-container">
        <Reveal>
          <SectionHeading
            eyebrow="Solutions"
            title="Built for the people who own the numbers."
            description="ReconIQ keeps the workflow close to finance reality: reports in, explained outcomes out, decisions with a human owner."
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SOLUTIONS.map((solution, index) => {
            const Icon = solution.icon
            return (
              <Reveal key={solution.title} delay={index * 70}>
                <article className="landing-glass landing-card-hover h-full rounded-2xl p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-electric-300/15 bg-gradient-to-br from-electric-500/20 to-electric-300/5 text-electric-300">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{solution.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-white/55">
                        {solution.description}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 grid gap-2 border-t border-white/[0.07] pt-4">
                    {solution.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-[11px] text-white/55">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-electric-300/80" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { isAuthenticated } = useAuth()

  return (
    <section id="get-started" className="landing-section">
      <div className="landing-container">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-electric-300/20 bg-gradient-to-b from-electric-500/20 via-ink-900/90 to-ink-950 px-6 py-14 text-center shadow-[0_40px_120px_-40px_rgba(37,99,255,0.55)] sm:px-10 sm:py-20">
            <div
              className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-electric-400/20 blur-[90px]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-electric-300/15 blur-[100px]"
              aria-hidden="true"
            />
            <div className="landing-hero-grid absolute inset-0 opacity-60" aria-hidden="true" />

            <div className="relative mx-auto max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
                <Sparkles className="h-3 w-3 text-electric-300" aria-hidden="true" />
                Start with your own reports
              </span>
              <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.8rem)] font-light leading-[1.04] tracking-[-0.04em] text-white">
                Bring every financial number into focus.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/50">
                Upload your first reports, review the mapping and run a reconciliation. Every match
                and claim stays under human control.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isAuthenticated ? (
                  <Link to="/dashboard" className="landing-btn-primary w-full sm:w-auto">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link to="/register" className="landing-btn-primary w-full sm:w-auto">
                    Get Started
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
                {!isAuthenticated && (
                  <Link to="/login" className="landing-btn-secondary w-full sm:w-auto">
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
