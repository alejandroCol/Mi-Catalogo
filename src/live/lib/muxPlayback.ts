/** Stream HLS demo siempre disponible (mock provider). */
export function isDemoLivePlaybackUrl(url: string): boolean {
  return (
    url.includes('test-streams.mux.dev') ||
    url.includes('mock.micatalogo.io') ||
    url.startsWith('rtmps://mock.')
  )
}

/** Extrae playback ID de URLs Mux HLS para @mux/mux-player-react. */
export function parseMuxPlaybackId(playbackUrl: string): string | null {
  const trimmed = playbackUrl.trim()
  if (!trimmed) return null
  const streamMatch = trimmed.match(/stream\.mux\.com\/([A-Za-z0-9]+)/)
  if (streamMatch?.[1]) return streamMatch[1]
  const demoMatch = trimmed.match(/test-streams\.mux\.dev\/([A-Za-z0-9]+)/)
  if (demoMatch?.[1]) return demoMatch[1]
  return null
}

/** Live real Mux: el manifiesto HLS solo existe cuando hay señal RTMP/WebRTC activa. */
export function shouldMountLivePlayer(opts: {
  playbackUrl: string
  isLive: boolean
  streamActive: boolean
  isEnded: boolean
}): boolean {
  if (!opts.playbackUrl.trim()) return false
  if (opts.isEnded) return true
  if (!opts.isLive) return isDemoLivePlaybackUrl(opts.playbackUrl)
  return opts.streamActive || isDemoLivePlaybackUrl(opts.playbackUrl)
}

/** Espera fija tras streamActive antes de montar Mux (RTMP tarda unos segundos). */
export const LIVE_MUX_SIGNAL_DELAY_MS = 4500

/** Tras un error del player, volver a intentar tras esta pausa. */
export const LIVE_MUX_ERROR_RETRY_MS = 4000
