import { AccessToken, EgressClient, RoomServiceClient } from 'livekit-server-sdk'
import { EncodingOptionsPreset, StreamOutput, StreamProtocol } from '@livekit/protocol'
import type {
  BrowserBroadcastRoomCredentials,
  BrowserIngestPort,
} from './browserIngestPort.js'

function muxRtmpUrl(ingestUrl: string, streamKey: string): string {
  const base = ingestUrl.replace(/\/$/, '')
  const key = streamKey.trim()
  if (base.includes('/app/')) return `${base}/${key}`.replace(/\/app\/\//, '/app/')
  return `${base}/${key}`
}

export class LivekitBrowserIngest implements BrowserIngestPort {
  readonly id = 'livekit' as const

  constructor(
    private readonly livekitUrl: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.livekitUrl && this.apiKey && this.apiSecret)
  }

  private roomName(tenantId: string, sessionId: string): string {
    return `mc-live-${tenantId}-${sessionId}`.slice(0, 128)
  }

  private roomService(): RoomServiceClient {
    return new RoomServiceClient(this.livekitUrl, this.apiKey, this.apiSecret)
  }

  private egressClient(): EgressClient {
    return new EgressClient(this.livekitUrl, this.apiKey, this.apiSecret)
  }

  async prepareBrowserBroadcast(opts: {
    tenantId: string
    sessionId: string
    hostUid: string
    hostName: string
  }): Promise<BrowserBroadcastRoomCredentials> {
    const roomName = this.roomName(opts.tenantId, opts.sessionId)
    const identity = `host-${opts.hostUid}`.slice(0, 64)

    const roomService = this.roomService()
    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 600,
        maxParticipants: 20,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.toLowerCase().includes('already exists')) {
        console.warn('[LivekitBrowserIngest] createRoom', roomName, msg)
      }
    }

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name: opts.hostName.slice(0, 64) || 'Host',
      ttl: '4h',
    })
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })
    const token = await at.toJwt()

    return {
      livekitUrl: this.livekitUrl,
      token,
      roomName,
    }
  }

  async startBrowserBroadcastEgress(opts: {
    tenantId: string
    sessionId: string
    hostUid: string
    rtmpIngestUrl: string
    streamKey: string
  }): Promise<{ egressId: string }> {
    const roomName = this.roomName(opts.tenantId, opts.sessionId)
    const identity = `host-${opts.hostUid}`.slice(0, 64)
    const rtmpUrl = muxRtmpUrl(opts.rtmpIngestUrl, opts.streamKey)

    const streamOutput = new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: [rtmpUrl],
    })

    const info = await this.egressClient().startParticipantEgress(
      roomName,
      identity,
      { stream: streamOutput },
      {
        encodingOptions: EncodingOptionsPreset.PORTRAIT_H264_720P_30,
      },
    )

    const egressId = info.egressId
    if (!egressId) {
      throw new Error('LiveKit egress did not return egressId')
    }

    return { egressId }
  }

  async stopBrowserBroadcast(egressId: string): Promise<void> {
    try {
      await this.egressClient().stopEgress(egressId)
    } catch (e) {
      console.warn('[LivekitBrowserIngest] stopEgress', egressId, e)
    }
  }
}
