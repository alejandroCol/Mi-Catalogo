import { logEvent, setUserProperties } from 'firebase/analytics'
import { getMcAnalytics } from '@/lib/firebase'

export const MC_ANALYTICS_EVENTS = {
  screenView: 'screen_view',
  storeVisit: 'store_visit',
  storeProductView: 'store_product_view',
  storeCheckoutStart: 'store_checkout_start',
  storeCheckoutComplete: 'store_checkout_complete',
  sellerRegistration: 'seller_registration',
  sellerQuickAction: 'seller_quick_action',
} as const

export async function trackMcScreenView(screenName: string, screenClass?: string): Promise<void> {
  const analytics = await getMcAnalytics()
  if (!analytics) return
  logEvent(analytics, MC_ANALYTICS_EVENTS.screenView, {
    firebase_screen: screenName,
    firebase_screen_class: screenClass ?? screenName,
  })
}

export async function trackMcEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const analytics = await getMcAnalytics()
  if (!analytics) return
  logEvent(analytics, name, params)
}

export async function setMcAnalyticsTenantContext(tenantId: string, slug: string): Promise<void> {
  const analytics = await getMcAnalytics()
  if (!analytics) return
  setUserProperties(analytics, {
    mc_tenant_id: tenantId,
    mc_store_slug: slug,
  })
}

export async function trackMcStoreEvent(
  event: keyof typeof MC_ANALYTICS_EVENTS,
  slug: string,
  extra?: Record<string, string | number>,
): Promise<void> {
  await trackMcEvent(MC_ANALYTICS_EVENTS[event], {
    store_slug: slug,
    ...extra,
  })
}
