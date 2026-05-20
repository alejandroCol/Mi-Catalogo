const SDK_URL = 'https://cdn.firstoken.co/captures/js/2.2/sdk.js'

export type FcCapturesApi = {
  init: (routeId: string, env: string, cb: () => void) => void
  field: (selector: string, opts: Record<string, unknown>) => void
  validate: (routeId: string) => Promise<{ hasErrors: boolean }>
  tokenize: (routeId: string) => Promise<{ token?: string; number?: string; card_token?: string }>
}

export function loadOnePayCapturesScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const w = window as unknown as { FTCaptures?: FcCapturesApi }
  if (w.FTCaptures) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_URL}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('SDK no cargó')))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar el SDK de pagos'))
    document.head.appendChild(s)
  })
}

export function getFcCaptures(): FcCapturesApi | null {
  const w = window as unknown as { FTCaptures?: FcCapturesApi }
  return w.FTCaptures ?? null
}

export function initCardFields(params: {
  suffix: string
  routeId: string
  publicKey: string
}): boolean {
  const FTCaptures = getFcCaptures()
  if (!FTCaptures) return false
  const env = params.publicKey.startsWith('pk_live') ? 'production' : 'staging'
  const suf = params.suffix
  try {
    FTCaptures.init(params.routeId, env, () => {})
    const css = {
      color: '#0a0a0a',
      height: '48px',
      'font-size': '15px',
      padding: '12px 14px',
      'box-sizing': 'border-box',
      'border-radius': '12px',
      border: '1px solid #e5e5e5',
      background: '#ffffff',
    }
    FTCaptures.field(`#op-cc-holder-${suf}`, {
      type: 'card-holder',
      name: 'holder',
      placeholder: 'Nombre del titular',
      required: 'true',
      css,
    })
    FTCaptures.field(`#op-cc-number-${suf}`, {
      type: 'card-number',
      name: 'number',
      placeholder: 'Número de tarjeta',
      required: 'true',
      css,
    })
    FTCaptures.field(`#op-cc-exp-${suf}`, {
      type: 'card-expiration-date',
      name: 'expiration_date',
      placeholder: 'MM/AA',
      required: 'true',
      css,
    })
    FTCaptures.field(`#op-cc-cvv-${suf}`, {
      type: 'card-security-code',
      name: 'cvv',
      placeholder: 'CVV',
      required: 'true',
      css,
    })
    return true
  } catch {
    return false
  }
}

export async function tokenizeCard(routeId: string): Promise<string> {
  const FTCaptures = getFcCaptures()
  if (!FTCaptures) throw new Error('SDK de pagos no disponible')
  const validation = await FTCaptures.validate(routeId)
  if (validation.hasErrors) throw new Error('Revisá los datos de la tarjeta.')
  const result = await FTCaptures.tokenize(routeId)
  const tok = [result.token, result.card_token, result.number].find(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  )
  if (!tok) throw new Error('No se pudo tokenizar la tarjeta.')
  return tok.trim()
}
