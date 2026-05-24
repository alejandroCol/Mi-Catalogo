import type { McTenant } from '@/types/mc'

/** Transportadoras Colombia soportadas por Envia.com en cotización. */
export const MC_ENVIA_CARRIERS_CO = ['coordinadora', 'servientrega', 'deprisa'] as const

export type McEnviaCarrierCode = (typeof MC_ENVIA_CARRIERS_CO)[number]

export const MC_ENVIA_CARRIER_LABELS: Record<McEnviaCarrierCode, string> = {
  coordinadora: 'Coordinadora',
  servientrega: 'Servientrega',
  deprisa: 'Deprisa',
}

export const MC_ENVIO_EMPAQUE_DEFAULTS = {
  pesoKg: 1,
  largoCm: 25,
  anchoCm: 20,
  altoCm: 10,
} as const

/** Empaque mínimo típico: objeto pequeño (ej. camiseta doblada en bolsa). */
export const MC_ENVIO_EMPAQUE_CAMISETA = {
  pesoKg: 0.3,
  largoCm: 30,
  anchoCm: 25,
  altoCm: 5,
} as const

export const MC_ENVIO_CHECKOUT_ETIQUETA = 'Envío'

export type EnvioCotizacionFuente = 'envia' | 'estatico'

export type EnvioCotizacionOpcion = {
  carrier: string
  carrierLabel: string
  service: string
  serviceDescription?: string
  totalPriceCop: number
  deliveryEstimate?: string
}

export type EnvioCotizacionResult = {
  envioCop: number
  fuente: EnvioCotizacionFuente
  /** Mejor tarifa cuando `fuente === 'envia'`. */
  seleccionada?: EnvioCotizacionOpcion
  /** Todas las tarifas válidas devueltas por Envia (ordenadas por precio). */
  opciones?: EnvioCotizacionOpcion[]
}

type TenantEnvioOrigenPick = Pick<
  McTenant,
  | 'envioCotizarAutomatico'
  | 'envioOrigenDepartamento'
  | 'envioOrigenCiudad'
  | 'envioOrigenDireccion'
  | 'envioOrigenTelefono'
  | 'envioEmpaquePesoKg'
  | 'envioEmpaqueLargoCm'
  | 'envioEmpaqueAnchoCm'
  | 'envioEmpaqueAltoCm'
>

export function isEnvioCotizacionAutomaticaConfigured(
  tenant: TenantEnvioOrigenPick | null | undefined,
): boolean {
  if (!tenant || tenant.envioCotizarAutomatico !== true) return false
  if (!tenant.envioOrigenDepartamento?.trim()) return false
  if (!tenant.envioOrigenCiudad?.trim()) return false
  if (!tenant.envioOrigenDireccion?.trim()) return false
  if (!tenant.envioOrigenTelefono?.replace(/\D/g, '')) return false
  const peso = tenant.envioEmpaquePesoKg
  const largo = tenant.envioEmpaqueLargoCm
  const ancho = tenant.envioEmpaqueAnchoCm
  const alto = tenant.envioEmpaqueAltoCm
  return (
    typeof peso === 'number' &&
    peso > 0 &&
    typeof largo === 'number' &&
    largo > 0 &&
    typeof ancho === 'number' &&
    ancho > 0 &&
    typeof alto === 'number' &&
    alto > 0
  )
}

export function empaqueCotizacionFromTenant(
  tenant: TenantEnvioOrigenPick | null | undefined,
): { pesoKg: number; largoCm: number; anchoCm: number; altoCm: number } {
  const pesoKg =
    typeof tenant?.envioEmpaquePesoKg === 'number' && tenant.envioEmpaquePesoKg > 0
      ? tenant.envioEmpaquePesoKg
      : MC_ENVIO_EMPAQUE_DEFAULTS.pesoKg
  return {
    pesoKg: Math.min(30, Math.max(0.1, pesoKg)),
    largoCm:
      typeof tenant?.envioEmpaqueLargoCm === 'number' && tenant.envioEmpaqueLargoCm > 0
        ? tenant.envioEmpaqueLargoCm
        : MC_ENVIO_EMPAQUE_DEFAULTS.largoCm,
    anchoCm:
      typeof tenant?.envioEmpaqueAnchoCm === 'number' && tenant.envioEmpaqueAnchoCm > 0
        ? tenant.envioEmpaqueAnchoCm
        : MC_ENVIO_EMPAQUE_DEFAULTS.anchoCm,
    altoCm:
      typeof tenant?.envioEmpaqueAltoCm === 'number' && tenant.envioEmpaqueAltoCm > 0
        ? tenant.envioEmpaqueAltoCm
        : MC_ENVIO_EMPAQUE_DEFAULTS.altoCm,
  }
}

export function carrierLabelFromCode(code: string): string {
  const key = code.toLowerCase() as McEnviaCarrierCode
  return MC_ENVIA_CARRIER_LABELS[key] ?? code
}

export function isMcEnviaCarrierCode(code: string): code is McEnviaCarrierCode {
  return (MC_ENVIA_CARRIERS_CO as readonly string[]).includes(code.toLowerCase())
}

/** Elige tarifa: favorita (más barata de esa transportadora) o la más barata global. */
export function selectEnvioQuoteOption(
  opciones: EnvioCotizacionOpcion[],
  transportadoraFavorita?: string | null,
): EnvioCotizacionOpcion | undefined {
  if (opciones.length === 0) return undefined
  const sorted = [...opciones].sort((a, b) => a.totalPriceCop - b.totalPriceCop)
  const fav = transportadoraFavorita?.trim().toLowerCase()
  if (fav && isMcEnviaCarrierCode(fav)) {
    const match = sorted.find((o) => o.carrier.toLowerCase() === fav)
    if (match) return match
  }
  return sorted[0]
}
