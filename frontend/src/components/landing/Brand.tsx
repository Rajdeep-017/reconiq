import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface BrandProps {
  className?: string
  onClick?: () => void
}

export function Brand({ className, onClick }: BrandProps) {
  const { pathname } = useLocation()

  const handleClick = () => {
    onClick?.()
    if (pathname === '/') {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }

  return (
    <Link
      to="/"
      onClick={handleClick}
      aria-label="ReconIQ home"
      className={cn('group inline-flex items-center gap-2.5', className)}
    >
      <span className="landing-logo-mark">
        <svg viewBox="0 0 24 24" fill="none" className="h-[1.15rem] w-[1.15rem]" aria-hidden="true">
          <path
            d="M5 18V6.4h7.1a4.25 4.25 0 0 1 0 8.5H9.4"
            stroke="white"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="m13.1 15.1 5.6 5.2"
            stroke="#B7E7FF"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="font-display text-[1.08rem] font-semibold tracking-[-0.02em] text-white">
        ReconIQ
      </span>
    </Link>
  )
}
