import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { hasShowroomFeatureAccess } from '@/lib/billingAccess'

/** Solo plan Master activo puede configurar Drop Room + Pasillo. */
export function RequireMcShowroomAccess({ children }: { children: React.ReactNode }) {
  const { tenant, loading } = useMcAuth()

  if (loading) {
    return (
      <div className="mc-shell">
        <p className="text-sm text-[var(--cat-muted)]">Cargando…</p>
      </div>
    )
  }

  if (!hasShowroomFeatureAccess(tenant)) {
    return <Navigate to="/app/plan" replace />
  }

  return children
}
