import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LayoutDashboard, Play, Sparkles } from 'lucide-react'
import { DashboardPreview } from '@/components/landing/DashboardPreview'
import { Reveal } from '@/components/landing/Reveal'
import { useAuth } from '@/hooks/useAuth'

const HERO_POINTS = ['Deterministic calculations', 'Human-reviewed matches', 'Tenant-scoped data']

export function Hero() {
  const { isAuthenticated } = useAuth()

  return (
    <section id="home" className="landing-hero">
      <div className="landing-hero-grid" aria-hidden="true" />
      <div className="landing-stars" aria-hidden="true" />
      <div className="landing-beam" aria-hidden="true" />
      <div className="landing-beam landing-beam-left" aria-hidden="true" />
      <div className="landing-arc" aria-hidden="true" />

      <div className="landing-container relative z-10">
        <div className="mx-auto max-w-6xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/55 backdrop-blur-sm sm:text-[11px]">
              <Sparkles className="h-3 w-3 text-electric-300" aria-hidden="true" />
              Introducing intelligent financial reconciliation
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 font-display text-[clamp(2.15rem,7.2vw,5.7rem)] font-light leading-[1.01] tracking-[-0.045em] text-white">
              <span className="block">Take Control of Your</span>
              <span className="block bg-gradient-to-r from-white via-[#dce9ff] to-[#7cc8ff] bg-clip-text text-transparent">
                Financial Reconciliation.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-sm leading-relaxed text-white/55 sm:text-base">
              Bring marketplace settlements, payment gateways, COD collections, shipping charges and
              returns together in one intelligent reconciliation workspace.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link to="/dashboard" className="landing-btn-primary w-full sm:w-auto">
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/register" className="landing-btn-primary w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <a href="#showcase" className="landing-btn-secondary w-full sm:w-auto">
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                Explore Platform
              </a>
            </div>
          </Reveal>

          <Reveal delay={310}>
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-white/45 sm:text-[11px]">
              {HERO_POINTS.map((point) => (
                <li key={point} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-electric-300/80" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="mt-14 sm:mt-16 lg:mt-20">
          <DashboardPreview />
        </div>
      </div>
    </section>
  )
}
