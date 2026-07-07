const BOGOTA_TZ = 'America/Bogota'
const MEET_CODE_PATTERN = /^[a-z]{3,4}-[a-z]{3,4}-[a-z]{3,4}$/i

/** Normaliza enlace de Google Meet (o Zoom) guardado. Acepta URL sin https:// o solo el código. */
export function normalizeTallerMeetLink(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null

  if (MEET_CODE_PATTERN.test(trimmed)) {
    return `https://meet.google.com/${trimmed.toLowerCase()}`
  }

  let url = trimmed
  if (/^\/\/.+/.test(url)) url = `https:${url}`
  else if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function readTallerMeetLinkFromData(data: {
  zoomLink?: string | null
  meetLink?: string | null
} | null | undefined): string | null {
  if (!data) return null
  return normalizeTallerMeetLink(data.zoomLink) ?? normalizeTallerMeetLink(data.meetLink)
}

/** Hosts permitidos para videollamada del taller (Google Meet, Zoom). */
export function isValidTallerMeetHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'meet.google.com') return true
    if (host === 'g.co' || host === 'meet.app.goo.gl') return true
    if (host.endsWith('.zoom.us') || host === 'zoom.us') return true
    return false
  } catch {
    return false
  }
}

export function isTallerMeetLinkLikelyInternal(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'micatalogo.io' || host.endsWith('.micatalogo.io') || host === 'localhost' || host === '127.0.0.1'
  } catch {
    return false
  }
}

export function formatMcTallerDate(dateMs: number): string {
  return new Date(dateMs).toLocaleString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: BOGOTA_TZ,
  })
}

/** Valor para `<input type="datetime-local">` en hora Colombia. */
export function mcTallerDateToInputValue(dateMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(dateMs))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function mcTallerInputValueToDateMs(value: string): number | null {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const h = Number(m[4])
  const mi = Number(m[5])
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null
  // datetime-local del admin se interpreta siempre como hora Colombia (UTC−5, sin DST).
  return Date.UTC(y, mo, d, h + 5, mi)
}

export function mcTallerEventPath(slug: string): string {
  return `/taller/${slug.trim().toLowerCase()}`
}

export function mcTallerRegisterPath(slug: string): string {
  return `${mcTallerEventPath(slug)}/inscribirse`
}

export function mcTallerPitchPath(slug: string): string {
  return `/superadmin/talleres/${slug.trim().toLowerCase()}/pitch`
}

/** @deprecated Usar mcTallerEventPath o mcTallerRegisterPath */
export function mcTallerPublicPath(slug: string): string {
  return mcTallerEventPath(slug)
}
