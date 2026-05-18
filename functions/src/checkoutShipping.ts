
function normalizeCiudadKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

type EnvioCiudad = { ciudad?: string; cop?: number }

export function resolveEnvioCopForCheckout(
  tenant:
    | {
        envioEstimadoCop?: number
        envioPorCiudad?: EnvioCiudad[]
        envioGratisDesdeCop?: number
      }
    | undefined,
  ciudadInput: string,
  subtotalCop: number,
): number {
  const sub = Math.max(0, Math.round(subtotalCop))
  const defaultCop =
    typeof tenant?.envioEstimadoCop === 'number' && Number.isFinite(tenant.envioEstimadoCop)
      ? Math.max(0, Math.round(tenant.envioEstimadoCop))
      : 0
  const lista = tenant?.envioPorCiudad ?? []
  const ciudad = ciudadInput.trim()
  const key = ciudad ? normalizeCiudadKey(ciudad) : ''

  let base = defaultCop
  if (key && lista.length > 0) {
    const found = lista.find((x) => x?.ciudad && normalizeCiudadKey(String(x.ciudad)) === key)
    if (found) {
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
    return 0
  }

  return base
}
