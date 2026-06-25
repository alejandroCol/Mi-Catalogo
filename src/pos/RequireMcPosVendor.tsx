import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcPosVendorUser, isMcSalesRepUser, isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'

export function RequireMcPosVendor({ children }: { children: React.ReactNode }) {
  const { profile, profileReady, loading, isImpersonating } = useMcAuth()

  if (loading || !profileReady) return null
  if (!profile) return <Navigate to="/login" replace />
  if (isMcPosVendorUser(profile)) return <>{children}</>
  if (
    isImpersonating &&
    (isMcSuperAdminUser(profile) || isMcSalesRepUser(profile))
  ) {
    return <>{children}</>
  }
  return <Navigate to="/pos/admin" replace />
}
