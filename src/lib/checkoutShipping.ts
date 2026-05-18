import type { McTenant } from '@/types/mc'

/** Comparar ciudades sin importar mayúsculas ni tildes. */
export function normalizeCiudadKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export type LineaEnvioCheckout = 'oculta' | 'cobro' | 'gratis_umbral' | 'gratis_ciudad'

export type EnvioTenantInput = Pick<
  McTenant,
  'envioEstimadoCop' | 'envioPorCiudad' | 'envioGratisDesdeCop'
>

/**
 * Calcula el envío del checkout a partir de la ciudad (lista o default), y aplica envío gratis por umbral de subtotal.
 * El umbral se compara con el subtotal de productos (antes de cupón y envío).
 */
export function resolveEnvioCop(
  tenant: EnvioTenantInput | null | undefined,
  ciudadInput: string,
  subtotalCop: number,
): { envioCop: number; lineaEnvio: LineaEnvioCheckout } {
  const sub = Math.max(0, Math.round(subtotalCop))

  const defaultCop =
    typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
      ? Math.max(0, Math.round(tenant.envioEstimadoCop))
      : 0

  const lista = tenant?.envioPorCiudad ?? []
  const ciudad = ciudadInput.trim()
  const key = ciudad ? normalizeCiudadKey(ciudad) : ''

  let base = defaultCop
  let matchedListedCity = false

  if (key && lista.length > 0) {
    const found = lista.find((x) => x?.ciudad && normalizeCiudadKey(String(x.ciudad)) === key)
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
