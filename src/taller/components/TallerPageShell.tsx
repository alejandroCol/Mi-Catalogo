import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'

type Props = {
  children: ReactNode
  eyebrow?: string
  title?: string
  subtitle?: string
}

export function TallerPageShell({ children, eyebrow, title, subtitle }: Props) {
  return (
    <div className="mc-landing mc-taller-page min-h-svh">
      <header className="mc-taller-page__header">
        <div className="mc-landing-container flex flex-col items-center gap-6 py-8 sm:py-10">
          <Link to="/" className="no-underline" aria-label="mi catálogo — inicio">
            <LandingBrandLogo />
          </Link>
          {title ? (
            <div className="max-w-2xl text-center">
              {eyebrow ? <p className="mc-landing-eyebrow">{eyebrow}</p> : null}
              <h1 className="mt-2 text-[clamp(1.5rem,4vw,2.25rem)] font-semibold leading-tight tracking-tighter text-mc-brand-gray">
                {title}
              </h1>
              {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-mc-600">{subtitle}</p> : null}
            </div>
          ) : null}
        </div>
      </header>
      <main className="mc-landing-container pb-20 pt-2 sm:pb-28">{children}</main>
    </div>
  )
}
