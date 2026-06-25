import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  isMcPosVendorUser,
  isMcSalesRepUser,
  isMcStoreOwnerUser,
  isMcSuperAdminUser,
} from '@/lib/mcUserFromFirestore'

/** Dueño de tienda, vendedor POS o demo con impersonación (súper admin / vendedor MC). */
export function RequireMcPosAccess({ children }: { children: React.ReactNode }) {
  const { profile, profileReady, loading, isImpersonating } = useMcAuth()

  if (loading || !profileReady) return null
  if (!profile) return <Navigate to="/login" replace />
  if (isMcStoreOwnerUser(profile) || isMcPosVendorUser(profile)) return <>{children}</>
  if (
    isImpersonating &&
    (isMcSuperAdminUser(profile) || isMcSalesRepUser(profile))
  ) {
    return <>{children}</>
  }
  return <Navigate to="/" replace />
}
