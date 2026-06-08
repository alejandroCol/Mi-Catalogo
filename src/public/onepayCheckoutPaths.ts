import { buildStorePublicPath } from '@/lib/storePublicUrl'

/** Retorno HTTP desde OnePay (popup o pestaña completa): polling del estado del pedido. */
export function publicCatalogOnePayReturnPath(
  slug: string,
  orderId: string,
  viewToken: string,
): string {
  const base = buildStorePublicPath(slug, '/checkout/pago-validando')
  const q = `onepay=1&o=${encodeURIComponent(orderId)}&ov=${encodeURIComponent(viewToken)}`
  return `${base}?${q}`
}

export const MC_ONEPAY_POPUP_NAME = 'mc_catalog_onepay'
export const MC_ONEPAY_DONE_MSG = 'mc-catalog-onepay-done' as const
