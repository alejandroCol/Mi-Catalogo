import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { LandingNav } from '@/landing/components/LandingNav'
import { LandingHero } from '@/landing/components/LandingHero'
import { LandingStoreShowcase } from '@/landing/components/LandingStoreShowcase'
import { LandingZeroCost } from '@/landing/components/LandingZeroCost'
import { LandingBentoFeatures } from '@/landing/components/LandingBentoFeatures'
import { LandingHowItWorks } from '@/landing/components/LandingHowItWorks'
import { LandingFinalCta } from '@/landing/components/LandingFinalCta'
import { LandingFooter } from '@/landing/components/LandingFooter'
import { LandingMobileDock } from '@/landing/components/LandingMobileDock'

export function LandingPage() {
  const { firebaseUser, loading } = useMcAuth()

  useEffect(() => {
    document.title = 'Mi Catálogo — Creá tu tienda online y empezá a vender'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Catálogos online hermosos para emprendedores colombianos. Registrate gratis y empezá a vender por WhatsApp hoy.',
      )
    }
  }, [])

  if (!loading && firebaseUser?.emailVerified) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-landing">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStoreShowcase />
        <LandingZeroCost />
        <LandingBentoFeatures />
        <LandingHowItWorks />
        <LandingFinalCta />
      </main>
      <LandingFooter />
      <LandingMobileDock />
    </div>
  )
}
