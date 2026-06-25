/** Puente opcional para publicar desde el navegador (WebRTC) hacia RTMP del proveedor. */
export type BrowserBroadcastRoomCredentials = {
  livekitUrl: string
  token: string
  roomName: string
}

export type BrowserBroadcastCredentials = BrowserBroadcastRoomCredentials & {
  egressId: string
}

export interface BrowserIngestPort {
  readonly id: 'livekit'
  isConfigured(): boolean
  /** Crea sala LiveKit y token del host (sin egress). */
  prepareBrowserBroadcast(opts: {
    tenantId: string
    sessionId: string
    hostUid: string
    hostName: string
  }): Promise<BrowserBroadcastRoomCredentials>
  /** Inicia RTMP egress hacia Mux cuando el host ya está en la sala. */
  startBrowserBroadcastEgress(opts: {
    tenantId: string
    sessionId: string
    hostUid: string
    rtmpIngestUrl: string
    streamKey: string
  }): Promise<{ egressId: string }>
  stopBrowserBroadcast(egressId: string): Promise<void>
}
