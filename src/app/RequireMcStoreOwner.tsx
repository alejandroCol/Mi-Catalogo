import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcPosVendorUser, isMcSalesRepUser } from '@/lib/mcUserFromFirestore'

export function RequireMcStoreOwner({ children }: { children: ReactNode }) {
  const { profile, profileReady } = useMcAuth()

  if (profileReady && profile && isMcSalesRepUser(profile)) {
    return <Navigate to="/vendedor" replace />
  }

  if (profileReady && profile && isMcPosVendorUser(profile)) {
    return <Navigate to="/pos/ventas" replace />
  }

  return <>{children}</>
}
