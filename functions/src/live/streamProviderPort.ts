/** Contrato para proveedores de streaming (Mux, LiveKit, etc.). */
export type StreamProviderId = 'mux' | 'mock'

export type CreateStreamInput = {
  /** Metadatos para correlacionar webhook ↔ sesión Firestore. */
  passthrough: string
  /** Título legible en el panel del proveedor. */
  title: string
}

export type CreateStreamResult = {
  provider: StreamProviderId
  streamId: string
  playbackUrl: string
  /** URL RTMP completa (host + key) o WHIP endpoint según proveedor. */
  ingestUrl: string
  /** Stream key separada (OBS). */
  streamKey: string
}

export interface StreamProviderPort {
  readonly id: StreamProviderId
  createStream(input: CreateStreamInput): Promise<CreateStreamResult>
  deleteStream(streamId: string): Promise<void>
  /** Si el proveedor expone estado vía API (opcional). */
  getStreamStatus?(streamId: string): Promise<'idle' | 'active' | 'unknown'>
}
