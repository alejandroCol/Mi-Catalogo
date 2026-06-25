import type { CreateStreamInput, CreateStreamResult, StreamProviderPort } from './streamProviderPort.js'
import { MuxStreamProviderError } from './liveErrors.js'

type MuxLiveStreamResponse = {
  data?: {
    id?: string
    stream_key?: string
    status?: string
    playback_ids?: { id?: string; policy?: string }[]
  }
}

function muxAuthHeader(tokenId: string, tokenSecret: string): string {
  return `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`
}

export class MuxStreamProvider implements StreamProviderPort {
  readonly id = 'mux' as const

  constructor(
    private readonly tokenId: string,
    private readonly tokenSecret: string,
    private readonly testMode = false,
  ) {}

  async createStream(input: CreateStreamInput): Promise<CreateStreamResult> {
    const res = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        Authorization: muxAuthHeader(this.tokenId, this.tokenSecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: { playback_policy: ['public'], test: this.testMode },
        passthrough: input.passthrough.slice(0, 255),
        reduced_latency: true,
        test: this.testMode,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new MuxStreamProviderError(res.status, body)
    }

    const json = (await res.json()) as MuxLiveStreamResponse
    const data = json.data
    const streamId = data?.id?.trim()
    const streamKey = data?.stream_key?.trim()
    const playbackId = data?.playback_ids?.[0]?.id?.trim()

    if (!streamId || !streamKey || !playbackId) {
      throw new Error('Mux response missing stream id, key or playback id')
    }

    return {
      provider: 'mux',
      streamId,
      playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      ingestUrl: 'rtmps://global-live.mux.com:443/app',
      streamKey,
    }
  }

  async deleteStream(streamId: string): Promise<void> {
    const res = await fetch(`https://api.mux.com/video/v1/live-streams/${encodeURIComponent(streamId)}`, {
      method: 'DELETE',
      headers: { Authorization: muxAuthHeader(this.tokenId, this.tokenSecret) },
    })
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '')
      console.warn('[MuxStreamProvider] deleteStream', streamId, res.status, body.slice(0, 120))
    }
  }

  async getStreamStatus(streamId: string): Promise<'idle' | 'active' | 'unknown'> {
    const res = await fetch(`https://api.mux.com/video/v1/live-streams/${encodeURIComponent(streamId)}`, {
      headers: { Authorization: muxAuthHeader(this.tokenId, this.tokenSecret) },
    })
    if (!res.ok) return 'unknown'
    const json = (await res.json()) as MuxLiveStreamResponse
    const status = json.data?.status
    if (status === 'active') return 'active'
    if (status === 'idle') return 'idle'
    return 'unknown'
  }
}
