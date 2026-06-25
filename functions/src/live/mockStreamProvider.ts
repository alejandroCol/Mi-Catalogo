import { randomBytes } from 'node:crypto'
import type { CreateStreamInput, CreateStreamResult, StreamProviderPort } from './streamProviderPort.js'

/** Stream HLS de prueba de Mux (Big Buck Bunny) para desarrollo sin credenciales. */
export const MOCK_PLAYBACK_HLS =
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'

export class MockStreamProvider implements StreamProviderPort {
  readonly id = 'mock' as const

  async createStream(_input: CreateStreamInput): Promise<CreateStreamResult> {
    const streamKey = `mock_${randomBytes(8).toString('hex')}`
    return {
      provider: 'mock',
      streamId: streamKey,
      playbackUrl: MOCK_PLAYBACK_HLS,
      ingestUrl: 'rtmps://mock.micatalogo.io/live',
      streamKey,
    }
  }

  async deleteStream(_streamId: string): Promise<void> {
    /* no-op */
  }
}
