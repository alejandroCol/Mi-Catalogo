import { addiHosts } from './config.js'
import type { AddiOnlineApplicationPayload } from './types.js'

export type AddiCallbackCredentials = { user: string; password: string }

export type AddiAllyAmountLimits = { minAmount: number; maxAmount: number }

/**
 * Cliente HTTP de Addi Applications (SRP: llamadas a la API de aplicaciones).
 */
export class AddiApplicationsClient {
  constructor(private readonly sandbox: boolean) {}

  private apiBase(): string {
    return addiHosts(this.sandbox).apiUrl
  }

  async createOnlineApplication(
    accessToken: string,
    payload: AddiOnlineApplicationPayload,
  ): Promise<{ redirectUrl: string; applicationId?: string }> {
    const res = await fetch(`${this.apiBase()}/v1/online-applications`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'MiCatalogo/1.0',
      },
      body: JSON.stringify(payload),
      redirect: 'manual',
    })

    const location = res.headers.get('location') || res.headers.get('Location')
    if ((res.status === 301 || res.status === 302 || res.status === 303) && location) {
      return { redirectUrl: location }
    }

    const text = await res.text()
    let json: Record<string, unknown> = {}
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      /* vacío */
    }

    if (!res.ok) {
      const msg =
        (typeof json.message === 'string' && json.message) ||
        (typeof json.error === 'string' && json.error) ||
        `HTTP ${res.status}`
      throw new Error(`Addi aplicación: ${msg}`)
    }

    const nested =
      json._links && typeof json._links === 'object'
        ? (json._links as { webRedirect?: { href?: string } }).webRedirect?.href
        : undefined
    const redirectUrl =
      (typeof json.redirectionUrl === 'string' && json.redirectionUrl) ||
      (typeof json.applicationUrl === 'string' && json.applicationUrl) ||
      (typeof nested === 'string' && nested) ||
      location ||
      ''

    if (!redirectUrl) {
      throw new Error('Addi no devolvió URL de redirección.')
    }

    const applicationId =
      (typeof json.applicationId === 'string' && json.applicationId) ||
      (typeof json.id === 'string' && json.id) ||
      undefined

    return { redirectUrl, applicationId }
  }

  async fetchCallbackCredentials(accessToken: string): Promise<AddiCallbackCredentials | null> {
    const res = await fetch(`${this.apiBase()}/v1/online-applications/callback-credentials`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { user?: string; password?: string }
    if (typeof json.user !== 'string' || typeof json.password !== 'string') return null
    if (!json.user || !json.password) return null
    return { user: json.user, password: json.password }
  }

  async fetchAllyAmountLimits(allySlug: string): Promise<AddiAllyAmountLimits | null> {
    const slug = allySlug.trim()
    if (!slug) return null
    const base = addiHosts(this.sandbox).channelsPublicApi
    const url = `${base}/allies/${encodeURIComponent(slug)}/config`
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const json = (await res.json()) as { minAmount?: number; maxAmount?: number }
      const minAmount = Number(json.minAmount)
      const maxAmount = Number(json.maxAmount)
      if (!Number.isFinite(minAmount) || !Number.isFinite(maxAmount)) return null
      return { minAmount: Math.round(minAmount), maxAmount: Math.round(maxAmount) }
    } catch {
      return null
    }
  }
}
