const PENDING_KEY = 'mc_pending_onboarding_tid'

export function markPendingSellerOnboarding(tenantId: string) {
  try {
    localStorage.setItem(PENDING_KEY, tenantId)
  } catch {
    /* private mode */
  }
}

export function clearPendingSellerOnboarding() {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* */
  }
}

export function shouldShowSellerOnboarding(tenantId: string | undefined) {
  if (!tenantId) return false
  try {
    return localStorage.getItem(PENDING_KEY) === tenantId
  } catch {
    return false
  }
}
