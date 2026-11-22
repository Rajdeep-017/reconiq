import { useEffect } from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import {
  FinalCta,
  HowItWorks,
  PlatformCapabilities,
  ProblemSection,
  SolutionsSection,
} from '@/components/landing/Sections'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { FaqSection } from '@/components/landing/FaqSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import '@/landing.css'

export function Landing() {
  useEffect(() => {
    document.body.classList.add('landing-body')

    const previousScrollBehavior = document.documentElement.style.scrollBehavior
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.style.scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth'

    return () => {
      document.body.classList.remove('landing-body')
      document.documentElement.style.scrollBehavior = previousScrollBehavior
    }
  }, [])

  return (
    <div className="landing-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
      >
        Skip to content
      </a>

      <LandingNav />

      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <Hero />
        <PlatformCapabilities />
        <ProblemSection />
        <HowItWorks />
        <ProductShowcase />
        <SolutionsSection />
        <FaqSection />
        <FinalCta />
      </main>

      <LandingFooter />
    </div>
  )
}
