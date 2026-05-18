import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured } from '@/lib/firebase'

export function RequireMcAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, profileReady, loading } = useMcAuth()

  if (!firebaseConfigured) {
    return (
      <div className="mc-shell flex min-h-svh items-center justify-center">
        <p className="ios-subhead text-center text-mc-700">Configurá Firebase en <code className="text-mc-900">.env</code></p>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="mc-shell flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900" aria-hidden />
        <p className="ios-subhead text-mc-600">Cargando…</p>
      </div>
    )
  }
  if (!firebaseUser) {
    return <Navigate to="/login" replace />
  }
  if (profileReady && !profile) {
    return <Navigate to="/registro" replace />
  }
  return <>{children}</>
}
