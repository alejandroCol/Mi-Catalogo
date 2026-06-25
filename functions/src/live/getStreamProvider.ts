import { defineSecret, defineString } from 'firebase-functions/params'
import { MockStreamProvider } from './mockStreamProvider.js'
import { MuxStreamProvider } from './muxStreamProvider.js'
import type { StreamProviderPort } from './streamProviderPort.js'

export const muxTokenId = defineSecret('MUX_TOKEN_ID')
export const muxTokenSecret = defineSecret('MUX_TOKEN_SECRET')

/** Si es "true" o "1", ignora Mux y usa stream demo (HLS de prueba). */
export const mcLiveUseMock = defineString('MC_LIVE_USE_MOCK', { default: 'false' })

/**
 * Streams Mux de prueba (test: true): gratis, watermark Mux, máx. ~5 min en vivo.
 * Poné "false" cuando pases a producción con cobro real por minuto.
 */
export const mcMuxLiveTest = defineString('MC_MUX_LIVE_TEST', { default: 'true' })

function flagEnabled(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

function useMockProvider(): boolean {
  return flagEnabled(mcLiveUseMock.value())
}

function useMuxTestStreams(): boolean {
  return flagEnabled(mcMuxLiveTest.value())
}

export function getStreamProvider(opts?: {
  muxTokenId?: string
  muxTokenSecret?: string
  muxTestMode?: boolean
}): StreamProviderPort {
  if (useMockProvider()) {
    console.warn('[live] MC_LIVE_USE_MOCK enabled — using mock stream provider')
    return new MockStreamProvider()
  }

  const id = opts?.muxTokenId?.trim()
  const secret = opts?.muxTokenSecret?.trim()
  if (id && secret) {
    const testMode = opts?.muxTestMode ?? useMuxTestStreams()
    if (testMode) {
      console.info('[live] MC_MUX_LIVE_TEST enabled — creating Mux test live streams')
    }
    return new MuxStreamProvider(id, secret, testMode)
  }
  console.warn('[live] MUX credentials missing — using mock stream provider')
  return new MockStreamProvider()
}

export const liveStreamSecrets = [muxTokenId, muxTokenSecret] as const
