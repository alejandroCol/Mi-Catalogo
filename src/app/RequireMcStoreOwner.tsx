import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSalesRepUser } from '@/lib/mcUserFromFirestore'

export function RequireMcStoreOwner({ children }: { children: ReactNode }) {
  const { profile, profileReady } = useMcAuth()

  if (profileReady && profile && isMcSalesRepUser(profile)) {
    return <Navigate to="/vendedor" replace />
  }

  return <>{children}</>
}
