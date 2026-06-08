import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcSalesRepUser, resolveMcHomePath } from '@/lib/mcUserFromFirestore'

export function RequireMcSalesRep({ children }: { children: ReactNode }) {
  const { profile, profileReady } = useMcAuth()

  if (profileReady && profile && !isMcSalesRepUser(profile)) {
    return <Navigate to={resolveMcHomePath(profile)} replace />
  }

  return <>{children}</>
}
