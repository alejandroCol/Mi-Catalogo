import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  isMcSalesRepUser,
  isMcSuperAdminUser,
  resolveMcHomePath,
} from '@/lib/mcUserFromFirestore'

/** Redirige cada rol a su panel correspondiente tras iniciar sesión. */
export function McPostLoginRedirect() {
  const { profile, profileReady, loading, isImpersonating } = useMcAuth()
  const location = useLocation()
  const nav = useNavigate()

  useEffect(() => {
    if (loading || !profileReady || !profile) return

    const path = location.pathname
    const home = resolveMcHomePath(profile)

    if (isMcSalesRepUser(profile)) {
      if (path === '/login' || path === '/app' || path.startsWith('/app/')) {
        nav('/vendedor', { replace: true })
      }
      return
    }

    if (isMcSuperAdminUser(profile) && !isImpersonating) {
      if (path === '/login' || path === '/app' || path.startsWith('/app/')) {
        nav('/superadmin', { replace: true })
      }
      return
    }

    if (path === '/login') {
      nav(home, { replace: true })
    }
  }, [profile, profileReady, loading, isImpersonating, location.pathname, nav])

  return null
}
