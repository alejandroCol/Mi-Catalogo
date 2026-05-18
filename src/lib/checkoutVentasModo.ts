import type { McTenant } from '@/types/mc'

/** Modo efectivo para UI del checkout público y textos del panel. */
export function effectiveCheckoutVentasModo(
  tenant: Pick<McTenant, 'checkoutVentasModo' | 'onepayPaymentsEnabled'> | null | undefined,
): 'pasarela' | 'whatsapp' | 'pasarela_micatalogo' {
  const m = tenant?.checkoutVentasModo
  if (m === 'pasarela' || m === 'whatsapp' || m === 'pasarela_micatalogo') return m
  return tenant?.onepayPaymentsEnabled === true ? 'pasarela' : 'whatsapp'
}
