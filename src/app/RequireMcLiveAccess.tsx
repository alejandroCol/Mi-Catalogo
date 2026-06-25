import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { hasLiveFeatureAccess } from '@/lib/billingAccess'

/** Solo plan Master activo puede acceder a live shopping. */
export function RequireMcLiveAccess({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useMcAuth()

  if (loading) {
    return (
      <div className="mc-shell">
        <p className="text-sm text-[var(--cat-muted)]">Cargando…</p>
      </div>
    )
  }

  if (!hasLiveFeatureAccess(tenant)) {
    return <Navigate to="/app" replace />
  }

  return children
}
