import { buildStorePublicPath } from '@/lib/storePublicUrl'

/** Retorno HTTP desde Addi (popup o pestaña): polling del estado del pedido. */
export function publicCatalogAddiReturnPath(
  slug: string,
  orderId: string,
  viewToken: string,
): string {
  const base = buildStorePublicPath(slug, '/checkout/pago-validando')
  const q = `addi=1&o=${encodeURIComponent(orderId)}&ov=${encodeURIComponent(viewToken)}`
  return `${base}?${q}`
}

export const MC_ADDI_POPUP_NAME = 'mc_catalog_addi'
export const MC_ADDI_DONE_MSG = 'mc-catalog-addi-done' as const
