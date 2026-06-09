import { useEffect } from 'react'
import { useIsCatalogPreview } from '@/public/CatalogTenantContext'
import { usePublicStoreSlug } from '@/public/PublicStoreContext'
import { getMcAnalyticsSessionId } from '@/lib/mcAnalyticsDates'
import { recordStoreAnalytics } from '@/lib/mcRecordStoreAnalytics'

/** Registra visita al catálogo público (1 por sesión/día + page view). */
export function usePublicCatalogVisitTracking() {
  const slug = usePublicStoreSlug()
  const isPreview = useIsCatalogPreview()

  useEffect(() => {
    if (!slug || isPreview) return
    void recordStoreAnalytics(slug, 'catalog_visit')
  }, [slug, isPreview])
}

/** Registra vista de producto en catálogo público. */
export function usePublicProductViewTracking(
  productId: string | undefined,
  productTitle?: string,
  productImageUrl?: string,
) {
  const slug = usePublicStoreSlug()
  const isPreview = useIsCatalogPreview()

  useEffect(() => {
    if (!slug || isPreview || !productId || !productTitle?.trim()) return
    void recordStoreAnalytics(slug, 'product_view', {
      productId,
      productTitle: productTitle.trim(),
      productImageUrl,
    })
  }, [slug, isPreview, productId, productTitle, productImageUrl])
}

/** Registra inicio de checkout en catálogo público. */
export function usePublicCheckoutStartTracking() {
  const slug = usePublicStoreSlug()
  const isPreview = useIsCatalogPreview()

  useEffect(() => {
    if (!slug || isPreview) return
    void recordStoreAnalytics(slug, 'checkout_start')
  }, [slug, isPreview])
}

/** Registra checkout completado (WhatsApp o pago aprobado). */
export function usePublicCheckoutCompleteTracking(orderId?: string) {
  const slug = usePublicStoreSlug()
  const isPreview = useIsCatalogPreview()

  useEffect(() => {
    if (!slug || isPreview) return
    const dedupeKey = orderId
      ? `mc_checkout_complete_${slug}_${orderId}`
      : `mc_checkout_complete_${slug}_${getMcAnalyticsSessionId()}`
    try {
      if (sessionStorage.getItem(dedupeKey)) return
      sessionStorage.setItem(dedupeKey, '1')
    } catch {
      /* continuar sin dedupe */
    }
    void recordStoreAnalytics(slug, 'checkout_complete')
  }, [slug, isPreview, orderId])
}
