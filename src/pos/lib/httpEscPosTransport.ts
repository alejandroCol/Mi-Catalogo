import type { PosPrintJob, PosTransport, PosTransportResult } from '@/pos/lib/posTypes'

const DEFAULT_BRIDGE = 'http://127.0.0.1:9123'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function humanizeFetchError(e: unknown, baseUrl: string): string {
  const msg = e instanceof Error ? e.message : String(e)
  const lower = msg.toLowerCase()
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed')
  ) {
    return `No se pudo conectar al puente POS (${baseUrl}). Ejecutá INICIAR-PUENTE.bat en la PC de caja.`
  }
  return `${msg}. ¿Está corriendo el puente en esta PC?`
}

export class HttpEscPosTransport implements PosTransport {
  private bridgeUrl: string

  constructor(bridgeUrl = DEFAULT_BRIDGE) {
    this.bridgeUrl = bridgeUrl.replace(/\/$/, '')
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.bridgeUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(2500),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async send(job: PosPrintJob): Promise<PosTransportResult> {
    try {
      const res = await fetch(`${this.bridgeUrl}/print`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName: job.printerName ?? '',
          rawBase64: bytesToBase64(job.data),
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) {
        let errText = await res.text().catch(() => '')
        try {
          const j = JSON.parse(errText) as { error?: string }
          if (j.error) errText = j.error
        } catch {
          /* texto plano */
        }
        return { ok: false, error: errText || `Bridge respondió ${res.status}` }
      }
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (json.ok === false) return { ok: false, error: json.error ?? 'Error desconocido' }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: humanizeFetchError(e, this.bridgeUrl) }
    }
  }
}
