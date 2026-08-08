import { addiHosts } from './config.js'

export type AddiTokenResult = {
  accessToken: string
  expiresIn?: number
}

/**
 * Responsabilidad única: obtener JWT vía OAuth2 client-credentials (Auth0).
 */
export class AddiAuthClient {
  constructor(private readonly sandbox: boolean) {}

  async fetchAccessToken(clientId: string, clientSecret: string): Promise<AddiTokenResult> {
    const hosts = addiHosts(this.sandbox)
    const res = await fetch(`${hosts.authUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        audience: hosts.audience,
        grant_type: 'client_credentials',
      }),
    })
    const text = await res.text()
    let json: { access_token?: string; expires_in?: number; error?: string; error_description?: string }
    try {
      json = JSON.parse(text) as typeof json
    } catch {
      throw new Error(`Addi auth respondió ${res.status} (JSON inválido).`)
    }
    if (!res.ok || !json.access_token) {
      const msg = json.error_description || json.error || `HTTP ${res.status}`
      throw new Error(`Addi auth: ${msg}`)
    }
    return {
      accessToken: json.access_token,
      expiresIn: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    }
  }
}
