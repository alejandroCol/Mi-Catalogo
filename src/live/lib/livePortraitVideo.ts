import type { VideoCaptureOptions } from 'livekit-client'

/** Resolución vertical 9:16 para live desde celular. */
export const LIVE_PORTRAIT_RESOLUTION = {
  width: 720,
  height: 1280,
  aspectRatio: 9 / 16,
  frameRate: 30,
} as const

export function livePortraitCaptureOptions(facingMode: 'user' | 'environment'): VideoCaptureOptions {
  return {
    facingMode,
    resolution: { ...LIVE_PORTRAIT_RESOLUTION },
  }
}

export function livePortraitMediaConstraints(facingMode: 'user' | 'environment'): MediaStreamConstraints {
  return {
    video: {
      facingMode,
      width: { ideal: LIVE_PORTRAIT_RESOLUTION.width },
      height: { ideal: LIVE_PORTRAIT_RESOLUTION.height },
      aspectRatio: { ideal: LIVE_PORTRAIT_RESOLUTION.aspectRatio },
    },
    audio: true,
  }
}
