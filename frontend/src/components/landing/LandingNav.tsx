import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react'
import { Brand } from '@/components/landing/Brand'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'platform', label: 'Platform', href: '#platform' },
  { id: 'how-it-works', label: 'How it works', href: '#how-it-works' },
  { id: 'solutions', label: 'Solutions', href: '#solutions' },
  { id: 'faq', label: 'FAQ', href: '#faq' },
] as const

export function LandingNav() {
  const { isAuthenticated, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActiveSection(visible.target.id)
      },
      { rootMargin: '-42% 0px -50% 0px', threshold: [0, 0.15, 0.4] }
    )

    for (const link of NAV_LINKS) {
      const section = document.getElementById(link.id)
      if (section) observer.observe(section)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [mobileOpen])

  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={cn(
          'landing-nav mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full px-3 py-2.5 sm:px-4',
          scrolled && 'is-scrolled'
        )}
      >
        <Brand onClick={closeMobile} />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Landing page navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="landing-nav-link"
              data-active={activeSection === link.id}
              aria-current={activeSection === link.id ? 'location' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
              >
                Sign out
              </button>
              <Link to="/dashboard" className="landing-btn-primary !px-4 !py-2 text-xs">
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Open dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link to="/register" className="landing-btn-primary !px-4 !py-2 text-xs">
                Sign up
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/75 transition-colors hover:text-white lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="landing-mobile-menu"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <div
        id="landing-mobile-menu"
        hidden={!mobileOpen}
        className="landing-nav landing-nav-menu landing-scrollbar mx-auto mt-2 max-h-[calc(100dvh_-_5.5rem)] max-w-5xl overflow-y-auto rounded-3xl p-3 lg:hidden"
      >
        <nav className="grid gap-1" aria-label="Mobile landing page navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={closeMobile}
              className="rounded-2xl px-4 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-white/[0.07] data-[active=true]:text-white"
              data-active={activeSection === link.id}
              aria-current={activeSection === link.id ? 'location' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-3 grid gap-2 border-t border-white/[0.08] pt-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={closeMobile}
                className="landing-btn-primary w-full !py-2.5 text-sm"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Open dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMobile()
                  logout()
                }}
                className="landing-btn-secondary w-full !py-2.5 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={closeMobile}
                className="landing-btn-secondary w-full !py-2.5 text-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="landing-btn-primary w-full !py-2.5 text-sm"
              >
                Sign up
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
