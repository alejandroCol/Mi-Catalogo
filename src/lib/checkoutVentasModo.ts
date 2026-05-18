import { isEnvioCheckoutConfigured, type EnvioMicatalogoTariffsPick } from '@/lib/checkoutShipping'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export type McCheckoutVentasModo = 'pasarela' | 'whatsapp' | 'pasarela_micatalogo'

/** Valor guardado en la tienda, sin fallback: hasta que no eligen en Cuenta, devuelve null. */
export function explicitCheckoutVentasModo(
  tenant: Pick<McTenant, 'checkoutVentasModo'> | null | undefined,
): McCheckoutVentasModo | null {
  const m = tenant?.checkoutVentasModo
  if (m === 'pasarela' || m === 'whatsapp' || m === 'pasarela_micatalogo') return m
  return null
}

type TenantVentasPick = Pick<
  McTenant,
  | 'checkoutVentasModo'
  | 'onepayPaymentsEnabled'
  | 'whatsappNumero'
  | 'envioEstimadoCop'
  | 'envioPorCiudad'
  | 'envioUsarTarifasMicatalogo'
>
type PlatformCatalogoPick = Pick<McPlatformSettings, 'pasarelaMicatalogoActiva'> & EnvioMicatalogoTariffsPick

/**
 * Catálogo/checkout listos para el vendedor solo si ya eligió modo en Cuenta y los requisitos se cumplen.
 * No se asume WhatsApp por defecto aunque el registro pida el número.
 */
export function isCheckoutVentasConfigured(
  tenant: TenantVentasPick | null | undefined,
  platformSettings: Pick<McPlatformSettings, 'pasarelaMicatalogoActiva'> | null | undefined,
): boolean {
  const modo = explicitCheckoutVentasModo(tenant)
  if (modo === null) return false
  if (modo === 'whatsapp') {
    const wa = tenant?.whatsappNumero?.replace(/\D/g, '') ?? ''
    return wa.length >= 10 && wa.length <= 15
  }
  if (modo === 'pasarela') return tenant?.onepayPaymentsEnabled === true
  if (modo === 'pasarela_micatalogo') {
    if (platformSettings == null) return false
    return platformSettings.pasarelaMicatalogoActiva === true
  }
  return false
}

/** Catálogo público listo para el vendedor: método de cobro y tarifas de envío definidos. */
export function isCatalogoVendedorListo(
  tenant: TenantVentasPick | null | undefined,
  platformSettings: PlatformCatalogoPick | null | undefined,
): boolean {
  return isCheckoutVentasConfigured(tenant, platformSettings) && isEnvioCheckoutConfigured(tenant, platformSettings)
}

export type CatalogoVendedorGate = 'ok' | 'ventas' | 'envio'

/** Qué falta antes de abrir o compartir el catálogo público. */
export function catalogoVendedorGate(
  tenant: TenantVentasPick | null | undefined,
  platformSettings: PlatformCatalogoPick | null | undefined,
): CatalogoVendedorGate {
  if (!isCheckoutVentasConfigured(tenant, platformSettings)) return 'ventas'
  if (!isEnvioCheckoutConfigured(tenant, platformSettings)) return 'envio'
  return 'ok'
}
