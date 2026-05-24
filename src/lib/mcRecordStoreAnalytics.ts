import { httpsCallable } from 'firebase/functions'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { getMcAnalyticsSessionId } from '@/lib/mcAnalyticsDates'
import { trackMcEvent, trackMcStoreEvent } from '@/lib/mcAnalytics'

export type StoreAnalyticsEvent =
  | 'catalog_visit'
  | 'product_view'
  | 'checkout_start'
  | 'checkout_complete'

export type RecordStoreAnalyticsOptions = {
  productId?: string
  productTitle?: string
  productImageUrl?: string
}

const inflight = new Set<string>()

function dedupeKey(slug: string, event: StoreAnalyticsEvent, productId?: string): string {
  const base = `${slug}:${event}:${getMcAnalyticsSessionId()}`
  return event === 'product_view' && productId ? `${base}:${productId}` : base
}

/** Persiste métricas en Firestore (callable) y envía evento a Firebase Analytics. */
export async function recordStoreAnalytics(
  slug: string,
  event: StoreAnalyticsEvent,
  options?: RecordStoreAnalyticsOptions,
): Promise<void> {
  if (!slug || !firebaseConfigured) return

  const key = dedupeKey(slug, event, options?.productId)
  if (event === 'catalog_visit' && inflight.has(key)) return
  if (event === 'product_view' && inflight.has(key)) return
  inflight.add(key)

  const sessionId = getMcAnalyticsSessionId()

  void (async () => {
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcRecordStoreAnalytics')
      await fn({
        slug,
        event,
        sessionId,
        productId: options?.productId,
        productTitle: options?.productTitle,
        productImageUrl: options?.productImageUrl,
      })
    } catch {
      /* métricas best-effort */
    }
  })()

  const analyticsMap = {
    catalog_visit: 'storeVisit',
    product_view: 'storeProductView',
    checkout_start: 'storeCheckoutStart',
    checkout_complete: 'storeCheckoutComplete',
  } as const

  if (event === 'product_view' && options?.productId) {
    void trackMcEvent('store_product_view', {
      store_slug: slug,
      product_id: options.productId,
    })
  } else {
    void trackMcStoreEvent(analyticsMap[event], slug)
  }
}
