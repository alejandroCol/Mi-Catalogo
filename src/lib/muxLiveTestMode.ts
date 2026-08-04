import type { McPlatformSettings } from '@/types/mc'

/**
 * Streams Mux de prueba (watermark TEST, ~5 min). Default: activado si no está definido.
 */
export function isMuxLiveTestEnabled(
  platformSettings: Pick<McPlatformSettings, 'muxLiveTestEnabled'> | null | undefined,
): boolean {
  if (platformSettings == null) return true
  if (typeof platformSettings.muxLiveTestEnabled === 'boolean') return platformSettings.muxLiveTestEnabled
  return true
}
