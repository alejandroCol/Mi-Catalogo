import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSuperAdminUser, resolveMcHomePath } from '@/lib/mcUserFromFirestore'
import { LandingNorrisPage } from '@/landing/norris/LandingNorrisPage'

/** Landing pública — rama Norris: scroll cinemático estilo landonorris.com */
export function LandingPage() {
  const { firebaseUser, profile, profileReady, loading, isImpersonating } = useMcAuth()

  if (!loading && profileReady && firebaseUser) {
    if (isImpersonating) {
      return <Navigate to="/app" replace />
    }
    if (profile && (firebaseUser.emailVerified || isMcSuperAdminUser(profile))) {
      return <Navigate to={resolveMcHomePath(profile)} replace />
    }
  }

  return <LandingNorrisPage />
}
