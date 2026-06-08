const ONPAY_BASE = 'https://api.onepay.la/v1'
const ONEPAY_CHARGES_API = `${ONPAY_BASE}/charges`
const ONEPAY_CUSTOMERS_API = `${ONPAY_BASE}/customers`
const ONEPAY_ACCOUNTS_API = `${ONPAY_BASE}/accounts`
const ONEPAY_CARDS_TOKENIZED_API = `${ONPAY_BASE}/cards/tokenized`
const ONEPAY_ACCOUNTS_BANKS_API = `${ONPAY_BASE}/accounts/banks`
const ONEPAY_BANKS_LEGACY_API = `${ONPAY_BASE}/banks`

export type OnePayMetadataEntry = { key: string; value: string }

export function billingMetadataForApi(entries: OnePayMetadataEntry[]): { key: string; value: string }[] {
  return entries
    .filter((e) => e.key && e.value)
    .map((e) => ({ key: e.key.slice(0, 64), value: String(e.value).slice(0, 200) }))
}

function readMetaString(meta: unknown, key: string): string {
  if (!meta || typeof meta !== 'object') return ''
  const m = meta as Record<string, unknown>
  if (Array.isArray(m)) {
    for (const item of m) {
      if (item && typeof item === 'object' && (item as { key?: string }).key === key) {
        return String((item as { value?: unknown }).value ?? '').trim()
      }
    }
    return ''
  }
  const v = m[key]
  return typeof v === 'string' ? v.trim() : ''
}

export function readBillingMeta(meta: unknown, flatKey: string): string {
  return readMetaString(meta, flatKey)
}

async function readOnePayJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`OnePay respondió ${res.status}`)
  }
}

export async function onepayCreateBillingCustomer(
  body: {
    first_name: string
    last_name: string
    email: string
    phone: string
    document_type: string
    document_number: string
    nationality?: string
    birthdate?: string
  },
  apiKey: string,
): Promise<string> {
  const res = await fetch(ONEPAY_CUSTOMERS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'x-idempotency': `mcc-${body.email}-${Date.now()}`.slice(0, 64),
    },
    body: JSON.stringify({
      user_type: 'natural',
      first_name: body.first_name.slice(0, 80),
      last_name: body.last_name.slice(0, 80),
      email: body.email.toLowerCase().slice(0, 120),
      phone: body.phone.slice(0, 20),
      document_type: body.document_type.slice(0, 12),
      document_number: body.document_number.slice(0, 32),
      enable_notifications: true,
      nationality: body.nationality ?? 'CO',
      birthdate: body.birthdate ?? '1990-01-01',
    }),
  })
  const data = await readOnePayJson<{
    id?: string
    message?: string
    errors?: Record<string, string[]>
  }>(res)
  if (!res.ok || !data.id) {
    const detail = data.errors
      ? Object.entries(data.errors)
          .flatMap(([k, v]) => v.map((x) => `${k}: ${x}`))
          .join('; ')
      : ''
    const base = (data.message || '').trim() || `Cliente OnePay ${res.status}`
    const extra =
      res.status === 401 || /appkey|api.?key|clave/i.test(base)
        ? ' Revisá la clave API (sk_) de la pasarela Mi Catálogo en súper admin.'
        : ''
    throw new Error([base, detail].filter(Boolean).join(' — ') + extra)
  }
  return data.id
}

export async function onepayCreateTokenizedCard(params: {
  secretKey: string
  customerId: string
  cardToken: string
}): Promise<{ id: string; brand?: string; last_four?: string }> {
  const res = await fetch(ONEPAY_CARDS_TOKENIZED_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.secretKey.trim()}`,
      'Content-Type': 'application/json',
      'x-idempotency': `mccard-${params.customerId}-${Date.now()}`.slice(0, 64),
    },
    body: JSON.stringify({
      card_token: params.cardToken.trim(),
      customer_id: params.customerId.trim(),
      authorization: true,
    }),
  })
  const data = await readOnePayJson<{
    id?: string
    brand?: string
    last_four?: string
    message?: string
    errors?: Record<string, string[]>
  }>(res)
  if (!res.ok || !data.id) {
    const detail = data.errors
      ? Object.entries(data.errors)
          .flatMap(([k, v]) => v.map((x) => `${k}: ${x}`))
          .join('; ')
      : ''
    throw new Error([data.message, detail].filter(Boolean).join(' — ') || 'Error al registrar tarjeta')
  }
  return { id: data.id, brand: data.brand, last_four: data.last_four }
}

export async function onepayCreateNequiAccount(params: {
  secretKey: string
  customerId: string
  accountNumber: string
  bankId: string
}): Promise<{ id: string; status?: string; authorization?: boolean }> {
  const res = await fetch(ONEPAY_ACCOUNTS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.secretKey.trim()}`,
      'Content-Type': 'application/json',
      'x-idempotency': `mcnequi-${params.customerId}-${Date.now()}`.slice(0, 64),
    },
    body: JSON.stringify({
      customer_id: params.customerId.trim(),
      subtype: 'ELECTRONIC_DEPOSIT',
      account_number: params.accountNumber.trim(),
      bank_id: params.bankId.trim(),
      authorization: true,
      're-enrollment': false,
    }),
  })
  const data = await readOnePayJson<{
    id?: string
    status?: string
    authorization?: boolean
    message?: string
  }>(res)
  if (!res.ok || !data.id) {
    throw new Error(data.message || 'No se pudo vincular Nequi')
  }
  return { id: data.id, status: data.status, authorization: data.authorization }
}

export async function onepayValidateAccount(
  accountId: string,
  apiKey: string,
  otp?: string,
): Promise<{ id: string; status?: string; message?: string }> {
  const body: { otp?: string } = {}
  if (otp?.trim()) body.otp = otp.trim()
  const res = await fetch(`${ONEPAY_ACCOUNTS_API}/${encodeURIComponent(accountId)}/validate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'x-idempotency': `mcval-${accountId}-${Date.now()}`.slice(0, 64),
    },
    body: JSON.stringify(body),
  })
  const data = await readOnePayJson<{ id?: string; status?: string; message?: string }>(res)
  if (!res.ok) {
    throw new Error(data.message || 'No se pudo validar Nequi')
  }
  return { id: data.id ?? accountId, status: data.status, message: data.message }
}

export type OnePayCard = { id: string; brand?: string; last_four?: string; authorization?: boolean }
export type OnePayAccount = {
  id: string
  status?: string
  subtype?: string
  authorization?: boolean
  bank?: { id?: string; name?: string }
}

export async function onepayListCards(customerId: string, secretKey: string): Promise<OnePayCard[]> {
  const res = await fetch(
    `${ONEPAY_CUSTOMERS_API}/${encodeURIComponent(customerId)}/cards?page=1`,
    { headers: { Authorization: `Bearer ${secretKey.trim()}` } },
  )
  const data = await readOnePayJson<{ data?: OnePayCard[] }>(res)
  if (!res.ok) return []
  return (data.data ?? []).filter((c): c is OnePayCard => typeof c.id === 'string')
}

export async function onepayListAccounts(customerId: string, secretKey: string): Promise<OnePayAccount[]> {
  const res = await fetch(
    `${ONEPAY_CUSTOMERS_API}/${encodeURIComponent(customerId)}/accounts?page=1`,
    { headers: { Authorization: `Bearer ${secretKey.trim()}` } },
  )
  const data = await readOnePayJson<{ data?: OnePayAccount[] }>(res)
  if (!res.ok) return []
  return (data.data ?? []).filter((a): a is OnePayAccount => typeof a.id === 'string')
}

export async function onepayListNequiBanks(secretKey: string): Promise<{ id: string; name: string }[]> {
  let res = await fetch(`${ONEPAY_ACCOUNTS_BANKS_API}?page=1&per_page=200`, {
    headers: { Authorization: `Bearer ${secretKey.trim()}` },
  })
  if (res.status === 404) {
    res = await fetch(`${ONEPAY_BANKS_LEGACY_API}?page=1&per_page=200`, {
      headers: { Authorization: `Bearer ${secretKey.trim()}` },
    })
  }
  const raw = await readOnePayJson<unknown>(res)
  if (!res.ok) return []
  let rows: unknown[] = []
  if (Array.isArray(raw)) rows = raw
  else if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
    rows = (raw as { data: unknown[] }).data
  }
  return rows
    .map((r) => {
      const o = r as { id?: string; name?: string }
      return typeof o.id === 'string' && o.name ? { id: o.id, name: o.name } : null
    })
    .filter((b): b is { id: string; name: string } => b != null)
    .filter((b) => /nequi/i.test(b.name))
}

export async function onepayCreateBillingCharge(params: {
  secretKey: string
  customerId: string
  amountCop: number
  title: string
  cardId?: string
  accountId?: string
  metadata: OnePayMetadataEntry[]
  externalId?: string
  idempotencyKey: string
}): Promise<{ id: string; status?: string; message?: string }> {
  const hasCard = Boolean(params.cardId?.trim())
  const hasAccount = Boolean(params.accountId?.trim())
  if (hasCard === hasAccount) {
    throw new Error('Se requiere tarjeta o Nequi (uno solo)')
  }
  const amount = Math.round(params.amountCop)
  if (amount <= 0) {
    throw new Error('OnePay no admite cargos de $0. Activá el plan sin cargo inicial.')
  }
  const body: Record<string, unknown> = {
    title: params.title.slice(0, 200),
    customer_id: params.customerId.trim(),
    amount,
    currency: 'COP',
    metadata: billingMetadataForApi(params.metadata),
  }
  if (hasCard) body.card_id = params.cardId!.trim()
  else body.account_id = params.accountId!.trim()
  if (params.externalId?.trim()) body.external_id = params.externalId.trim().slice(0, 200)

  const res = await fetch(ONEPAY_CHARGES_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.secretKey.trim()}`,
      'Content-Type': 'application/json',
      'x-idempotency': params.idempotencyKey.slice(0, 64),
    },
    body: JSON.stringify(body),
  })
  const data = await readOnePayJson<{
    id?: string
    status?: string
    message?: string
    errors?: Record<string, string[]>
  }>(res)
  if (!res.ok) {
    const detail = data.errors
      ? Object.entries(data.errors)
          .flatMap(([k, v]) => v.map((x) => `${k}: ${x}`))
          .join('; ')
      : ''
    throw new Error([data.message, detail].filter(Boolean).join(' — ') || `Cargo ${res.status}`)
  }
  if (!data.id) throw new Error('No se recibió id de cargo')
  return { id: data.id, status: data.status, message: data.message }
}

export async function onepayGetCharge(
  chargeId: string,
  secretKey: string,
): Promise<{ id: string; status?: string; metadata?: unknown; amount?: number } | null> {
  const res = await fetch(`${ONEPAY_CHARGES_API}/${encodeURIComponent(chargeId)}`, {
    headers: { Authorization: `Bearer ${secretKey.trim()}` },
  })
  if (!res.ok) return null
  const data = await readOnePayJson<{ id?: string; status?: string; metadata?: unknown; amount?: number }>(res)
  if (!data.id) return null
  return { id: data.id, status: data.status, metadata: data.metadata, amount: data.amount }
}

export function chargeStatusPaid(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase()
  return s === 'paid' || s === 'succeeded' || s === 'approved' || s === 'completed'
}

export function chargeStatusFailed(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase()
  return s === 'declined' || s === 'failed' || s === 'rejected'
}

export function accountReadyForDebit(acc: OnePayAccount): boolean {
  const st = (acc.status ?? '').toLowerCase()
  if (st === 'rejected' || st === 'inactive' || st === 'failed') return false
  if (st === 'pending' || st === 'validating' || st === 'waiting') return false
  if (acc.authorization === true) return true
  // OnePay a veces omite `authorization` cuando el estado ya es activo/aprobado.
  if (
    (st === 'active' || st === 'approved' || st === 'enabled' || st === 'linked') &&
    acc.authorization !== false
  ) {
    return true
  }
  return false
}

export async function onepayGetAccount(
  accountId: string,
  secretKey: string,
): Promise<OnePayAccount | null> {
  const res = await fetch(`${ONEPAY_ACCOUNTS_API}/${encodeURIComponent(accountId)}`, {
    headers: { Authorization: `Bearer ${secretKey.trim()}` },
  })
  if (!res.ok) return null
  const data = await readOnePayJson<OnePayAccount>(res)
  return typeof data.id === 'string' ? data : null
}
