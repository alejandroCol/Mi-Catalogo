import type { McPlatformSettings, McTenant } from '@/types/mc'
import { isEnvioCotizacionAutomaticaConfigured } from '@/lib/envioCotizacion'

/** Comparar ciudades sin importar mayúsculas ni tildes. */
export function normalizeCiudadKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export type LineaEnvioCheckout = 'oculta' | 'cobro' | 'gratis_umbral' | 'gratis_ciudad' | 'cotizacion'

export type EnvioTenantInput = Pick<
  McTenant,
  'envioEstimadoCop' | 'envioPorCiudad' | 'envioGratisDesdeCop'
>

export type EnvioMicatalogoTariffsPick = Pick<
  McPlatformSettings,
  'envioMicatalogoEstimadoCop' | 'envioMicatalogoPorCiudad'
>

export type EnvioTenantConfigPick = Pick<
  McTenant,
  | 'envioEstimadoCop'
  | 'envioPorCiudad'
  | 'envioUsarTarifasMicatalogo'
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

/**
 * El dueño ya definió envío para el checkout: cotización automática completa
 * o al menos una ciudad con tarifa manual.
 */
export function isEnvioCheckoutConfigured(
  tenant: EnvioTenantConfigPick | null | undefined,
  _platformSettings?: EnvioMicatalogoTariffsPick | null | undefined,
): boolean {
  if (!tenant) return false

  if (isEnvioCotizacionAutomaticaConfigured(tenant)) {
    return true
  }

  if (tenant.envioCotizarAutomatico !== true) {
    return (tenant.envioPorCiudad ?? []).some((x) => Boolean(x?.ciudad?.trim()))
  }

  return false
}

/**
 * Combina tarifas de la tienda con las tarifas plataforma cuando el dueño activó “usar Mi Catálogo”.
 * Si la plataforma aún no tiene datos, se sigue usando la configuración de la tienda.
 */
export function effectiveEnvioPricingForCheckout(
  tenant: Pick<
    McTenant,
    'envioEstimadoCop' | 'envioPorCiudad' | 'envioGratisDesdeCop' | 'envioUsarTarifasMicatalogo'
  > | null | undefined,
  platform: EnvioMicatalogoTariffsPick | null | undefined,
): EnvioTenantInput {
  const gratis = tenant?.envioGratisDesdeCop
  const plat = platform ?? undefined
  const platformHasTariffs =
    !!plat &&
    ((typeof plat.envioMicatalogoEstimadoCop === 'number' &&
      Number.isFinite(plat.envioMicatalogoEstimadoCop)) ||
      ((plat.envioMicatalogoPorCiudad?.length ?? 0) > 0))

  if (tenant?.envioUsarTarifasMicatalogo === true && platformHasTariffs && plat) {
    const platformDefault =
      typeof plat.envioMicatalogoEstimadoCop === 'number' &&
      Number.isFinite(plat.envioMicatalogoEstimadoCop)
        ? Math.max(0, Math.round(plat.envioMicatalogoEstimadoCop))
        : typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
          ? Math.max(0, Math.round(tenant.envioEstimadoCop))
          : 0

    return {
      envioEstimadoCop: platformDefault,
      envioPorCiudad: plat.envioMicatalogoPorCiudad ?? [],
      envioGratisDesdeCop: gratis,
    }
  }

  return {
    envioEstimadoCop: tenant?.envioEstimadoCop,
    envioPorCiudad: tenant?.envioPorCiudad,
    envioGratisDesdeCop: gratis,
  }
}

function findListedTarifaPorCiudad(
  lista: NonNullable<EnvioTenantInput['envioPorCiudad']>,
  ciudadKey: string,
  departamentoKey: string,
): (typeof lista)[number] | undefined {
  if (!ciudadKey || lista.length === 0) return undefined

  type Row = NonNullable<EnvioTenantInput['envioPorCiudad']>[number]

  const cityMatches = (x: Row) =>
    Boolean(x?.ciudad && normalizeCiudadKey(String(x.ciudad)) === ciudadKey)

  const deptoNormalized = normalizeCiudadKey(departamentoKey)

  if (deptoNormalized) {
    const explicit = lista.find(
      (x) =>
        cityMatches(x) &&
        x.departamento &&
        normalizeCiudadKey(String(x.departamento)) === deptoNormalized,
    )
    if (explicit) return explicit
    return lista.find((x) => cityMatches(x) && (!x.departamento || !String(x.departamento).trim()))
  }

  return lista.find((x) => cityMatches(x) && (!x.departamento || !String(x.departamento).trim()))
}

/**
 * Calcula el envío del checkout a partir de la ciudad (lista o default), y aplica envío gratis por umbral de subtotal.
 * El umbral se compara con el subtotal de productos (antes de cupón y envío).
 * Si la fila de tarifa incluye `departamento`, se tiene en cuenta junto al del cliente para evitar municipios homónimos.
 */
export function resolveEnvioCop(
  tenant: EnvioTenantInput | null | undefined,
  ciudadInput: string,
  subtotalCop: number,
  departamentoInput?: string,
): { envioCop: number; lineaEnvio: LineaEnvioCheckout } {
  const sub = Math.max(0, Math.round(subtotalCop))

  const defaultCop =
    typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
      ? Math.max(0, Math.round(tenant.envioEstimadoCop))
      : 0

  const lista = tenant?.envioPorCiudad ?? []
  const ciudad = ciudadInput.trim()
  const key = ciudad ? normalizeCiudadKey(ciudad) : ''
  const dept = departamentoInput?.trim() ?? ''

  let base = defaultCop
  let matchedListedCity = false

  if (key && lista.length > 0) {
    const found = findListedTarifaPorCiudad(lista, key, dept)
    if (found) {
      matchedListedCity = true
      const c = typeof found.cop === 'number' && Number.isFinite(found.cop) ? Math.round(found.cop) : 0
      base = Math.max(0, c)
    } else {
      base = defaultCop
    }
  } else if (!key) {
    base = defaultCop
  }

  const umbral =
    typeof tenant?.envioGratisDesdeCop === 'number' && Number.isFinite(tenant.envioGratisDesdeCop)
      ? Math.max(0, Math.round(tenant.envioGratisDesdeCop))
      : 0

  if (umbral > 0 && sub >= umbral) {
    return { envioCop: 0, lineaEnvio: 'gratis_umbral' }
  }

  const envioCop = base

  if (envioCop > 0) {
    return { envioCop, lineaEnvio: 'cobro' }
  }
  if (matchedListedCity && envioCop === 0) {
    return { envioCop: 0, lineaEnvio: 'gratis_ciudad' }
  }

  return { envioCop: 0, lineaEnvio: 'oculta' }
}
