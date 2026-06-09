import { isEnvioCheckoutConfigured, type EnvioMicatalogoTariffsPick } from '@/lib/checkoutShipping'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export type McCheckoutVentasModo = 'pasarela' | 'whatsapp' | 'pasarela_micatalogo'

export type OnepayPasarelaGate =
  | 'active'
  | 'needs_kyb'
  | 'pending_review'
  | 'approved_linking'
  | 'rejected'

export type OnepayPasarelaGateUi = {
  gate: OnepayPasarelaGate
  canSelect: boolean
  title: string
  message: string
  tone: 'ok' | 'warn' | 'info' | 'error'
  ctaLabel: string | null
}

type TenantOnepayPick = Pick<
  McTenant,
  'onepayPaymentsEnabled' | 'onepayKybStatus' | 'onepayKybSubmittedAt' | 'onepayCompanyId'
>

/** Estado de elegibilidad para usar Pasarela (OnePay) como método de cobro. */
export function onepayPasarelaGateUi(
  tenant: TenantOnepayPick | null | undefined,
): OnepayPasarelaGateUi {
  if (tenant?.onepayPaymentsEnabled === true) {
    return {
      gate: 'active',
      canSelect: true,
      title: 'Pasarela activa',
      message: 'Tu cuenta comercio OnePay está vinculada. Podés cobrar en el checkout.',
      tone: 'ok',
      ctaLabel: null,
    }
  }

  const kyb = tenant?.onepayKybStatus

  if (kyb === 'pending' || (tenant?.onepayKybSubmittedAt && !kyb)) {
    return {
      gate: 'pending_review',
      canSelect: false,
      title: 'Solicitud en revisión',
      message: tenant?.onepayCompanyId
        ? `Tu empresa OnePay está siendo revisada por el equipo. Cuando la aprueben y vinculen la pasarela a tu tienda, podrás elegir este método.`
        : 'Tu solicitud OnePay está en revisión. Cuando el equipo la apruebe y complete la vinculación, podrás elegir este método.',
      tone: 'info',
      ctaLabel: 'Ver estado de mi solicitud',
    }
  }

  if (kyb === 'approved') {
    return {
      gate: 'approved_linking',
      canSelect: false,
      title: 'Empresa aprobada',
      message:
        'Tu empresa OnePay fue aprobada. El equipo está completando la vinculación (clave API y webhook). Te avisamos cuando puedas activar cobros.',
      tone: 'info',
      ctaLabel: 'Ver estado de mi solicitud',
    }
  }

  if (kyb === 'rejected') {
    return {
      gate: 'rejected',
      canSelect: false,
      title: 'Solicitud rechazada',
      message:
        'Tu solicitud OnePay no fue aprobada. Revisá los datos y volvé a enviarla para poder usar esta pasarela.',
      tone: 'error',
      ctaLabel: 'Corregir solicitud OnePay',
    }
  }

  return {
    gate: 'needs_kyb',
    canSelect: false,
    title: 'Vinculación pendiente',
    message: 'Creá tu empresa en OnePay para activar cobros con tarjeta, Nequi, PSE y más.',
    tone: 'warn',
    ctaLabel: 'Crear empresa OnePay',
  }
}

export function canSelectPasarelaOnepay(tenant: TenantOnepayPick | null | undefined): boolean {
  return onepayPasarelaGateUi(tenant).canSelect
}

/** Valor guardado en la tienda, sin fallback: hasta que no eligen en Cuenta, devuelve null. */
export function explicitCheckoutVentasModo(
  tenant: Pick<McTenant, 'checkoutVentasModo'> | null | undefined,
): McCheckoutVentasModo | null {
  const m = tenant?.checkoutVentasModo
  if (m === 'pasarela' || m === 'whatsapp' || m === 'pasarela_micatalogo') return m
  return null
}

/** El vendedor ya eligió un modo de cobro en Cuenta (aunque falte completar requisitos). */
export function hasCheckoutVentasModoSelected(
  tenant: Pick<McTenant, 'checkoutVentasModo'> | null | undefined,
): boolean {
  return explicitCheckoutVentasModo(tenant) !== null
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

/** Cobro activo distinto de WhatsApp (OnePay o pasarela Mi Catálogo). */
export function hasNonWhatsappCheckoutVentasEnabled(
  tenant: TenantVentasPick | null | undefined,
  platformSettings: Pick<McPlatformSettings, 'pasarelaMicatalogoActiva'> | null | undefined,
): boolean {
  const modo = explicitCheckoutVentasModo(tenant)
  if (modo === null || modo === 'whatsapp') return false
  return isCheckoutVentasConfigured(tenant, platformSettings)
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
