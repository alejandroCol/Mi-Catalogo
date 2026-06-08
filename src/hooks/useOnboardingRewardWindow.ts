import { useEffect, useState } from 'react'
import {
  isWithinOnboardingExpertRewardWindow,
  onboardingExpertRewardDeadlineMs,
} from '@/lib/newStoreOnboarding'
import type { McTenant } from '@/types/mc'

type TenantCreatedAt = Pick<McTenant, 'createdAt'>

/** Reloj en vivo para ocultar la promo Expert al vencer las 24 h sin recargar la página. */
export function useOnboardingRewardWindow(tenant: TenantCreatedAt | null | undefined) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!tenant || typeof tenant.createdAt !== 'number') return

    const deadlineMs = onboardingExpertRewardDeadlineMs(tenant)
    const msUntilDeadline = deadlineMs - Date.now()
    if (msUntilDeadline <= 0) return

    const tickMs = msUntilDeadline <= 5 * 60 * 1000 ? 1_000 : 30_000
    const interval = window.setInterval(() => setNowMs(Date.now()), tickMs)
    const timeout = window.setTimeout(() => {
      setNowMs(Date.now())
      window.clearInterval(interval)
    }, msUntilDeadline + 120)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [tenant?.createdAt])

  const withinWindow = tenant ? isWithinOnboardingExpertRewardWindow(tenant, nowMs) : false
  const deadlineMs = tenant ? onboardingExpertRewardDeadlineMs(tenant) : 0

  return { nowMs, withinWindow, deadlineMs }
}
