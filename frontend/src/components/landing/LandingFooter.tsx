import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Brand } from '@/components/landing/Brand'

const PLATFORM_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Platform', href: '#platform' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Product showcase', href: '#showcase' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'FAQ', href: '#faq' },
]

const CAPABILITY_LINKS = [
  { label: 'Data ingestion', href: '#platform' },
  { label: 'Column mapping', href: '#platform' },
  { label: 'Normalization', href: '#platform' },
  { label: 'Reconciliation', href: '#showcase' },
  { label: 'Discrepancies', href: '#showcase' },
  { label: 'Claims', href: '#showcase' },
]

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] pb-8 pt-14">
      <div className="landing-container">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.7fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/50">
              Intelligent financial reconciliation for marketplace settlements, COD, freight,
              returns and claims — with human review kept explicit.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[10px] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              Deterministic calculations · human-controlled approvals
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Platform
            </h2>
            <ul className="mt-4 space-y-2.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-white/55 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Capabilities
            </h2>
            <ul className="mt-4 space-y-2.5">
              {CAPABILITY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-xs text-white/55 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Account
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 text-xs text-white/55 transition-colors hover:text-white"
                >
                  Sign in
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 text-xs text-white/55 transition-colors hover:text-white"
                >
                  Create account
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-6 sm:flex-row">
          <p className="text-[10px] text-white/35">
            © {new Date().getFullYear()} ReconIQ. All rights reserved.
          </p>
          <p className="text-[10px] text-white/35">
            Built for finance teams that need every number to reconcile.
          </p>
        </div>
      </div>
    </footer>
  )
}
