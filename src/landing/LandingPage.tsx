import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser, resolveMcHomePath } from '@/lib/mcUserFromFirestore'
import { LandingNav } from '@/landing/components/LandingNav'
import { LandingHero } from '@/landing/components/LandingHero'
import { LandingStoreShowcase } from '@/landing/components/LandingStoreShowcase'
import { LandingZeroCost } from '@/landing/components/LandingZeroCost'
import { LandingBentoFeatures } from '@/landing/components/LandingBentoFeatures'
import { LandingHowItWorks } from '@/landing/components/LandingHowItWorks'
import { LandingPosSection } from '@/landing/components/LandingPosSection'
import { LandingFinalCta } from '@/landing/components/LandingFinalCta'
import { LandingFooter } from '@/landing/components/LandingFooter'
import { LandingMobileDock } from '@/landing/components/LandingMobileDock'
import { LandingWhatsAppButton } from '@/landing/components/LandingWhatsAppButton'

export function LandingPage() {
  const { firebaseUser, profile, profileReady, loading, isImpersonating } = useMcAuth()

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

  if (!loading && profileReady && firebaseUser) {
    if (isImpersonating) {
      return <Navigate to="/app" replace />
    }
    if (profile && (firebaseUser.emailVerified || isMcSuperAdminUser(profile))) {
      return <Navigate to={resolveMcHomePath(profile)} replace />
    }
  }

  return (
    <div className="mc-landing">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStoreShowcase />
        <LandingZeroCost />
        <LandingBentoFeatures />
        <LandingPosSection />
        <LandingHowItWorks />
        <LandingFinalCta />
      </main>
      <LandingFooter />
      <LandingMobileDock />
      <LandingWhatsAppButton />
    </div>
  )
}
