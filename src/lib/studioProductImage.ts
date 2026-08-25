import { useEffect, useState } from 'react'

export type StudioImageEligibility = 'pending' | 'studio' | 'busy' | 'unknown' | 'none'

type CornerSample = { l: number; s: number }

const eligibilityCache = new Map<string, StudioImageEligibility>()
const inflight = new Map<string, Promise<StudioImageEligibility>>()

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max <= 0.001) return 0
  return (max - min) / max
}

function sampleCorner(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  size: number,
): CornerSample {
  let lSum = 0
  let sSum = 0
  let n = 0
  const x1 = Math.min(width, x0 + size)
  const y1 = Math.min(height, y0 + size)
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      lSum += luminance(r, g, b)
      sSum += saturation(r, g, b)
      n += 1
    }
  }
  return { l: n ? lSum / n : 0, s: n ? sSum / n : 0 }
}

function sampleCenter(data: Uint8ClampedArray, width: number, height: number): CornerSample {
  const cx = Math.floor(width * 0.35)
  const cy = Math.floor(height * 0.3)
  const cw = Math.floor(width * 0.3)
  const ch = Math.floor(height * 0.4)
  return sampleCorner(data, width, height, cx, cy, Math.min(cw, ch))
}

function classifyFromPixels(data: Uint8ClampedArray, width: number, height: number): StudioImageEligibility {
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.08))
  const corners = [
    sampleCorner(data, width, height, 0, 0, pad),
    sampleCorner(data, width, height, width - pad, 0, pad),
    sampleCorner(data, width, height, 0, height - pad, pad),
    sampleCorner(data, width, height, width - pad, height - pad, pad),
  ]
  const avgL = corners.reduce((s, c) => s + c.l, 0) / corners.length
  const avgS = corners.reduce((s, c) => s + c.s, 0) / corners.length
  const lSpread = Math.max(...corners.map((c) => c.l)) - Math.min(...corners.map((c) => c.l))
  const center = sampleCenter(data, width, height)

  const studioCorners = avgL >= 0.78 && avgS <= 0.22 && lSpread <= 0.16
  const productInFrame = center.l + 0.08 < avgL || center.s > avgS + 0.08
  if (studioCorners && productInFrame) return 'studio'
  if (studioCorners) return 'studio'
  return 'busy'
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image'))
    img.src = url
  })
}

async function analyzeUrl(url: string): Promise<StudioImageEligibility> {
  try {
    const img = await loadImage(url)
    const max = 96
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
    const w = Math.max(24, Math.round((img.naturalWidth || img.width) * scale))
    const h = Math.max(24, Math.round((img.naturalHeight || img.height) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return 'unknown'
    ctx.drawImage(img, 0, 0, w, h)
    const pixels = ctx.getImageData(0, 0, w, h)
    return classifyFromPixels(pixels.data, w, h)
  } catch {
    return 'unknown'
  }
}

export async function analyzeStudioProductImage(url: string | undefined): Promise<StudioImageEligibility> {
  if (!url?.trim()) return 'none'
  const cached = eligibilityCache.get(url)
  if (cached && cached !== 'pending') return cached
  const existing = inflight.get(url)
  if (existing) return existing
  const job = analyzeUrl(url).then((result) => {
    eligibilityCache.set(url, result)
    inflight.delete(url)
    return result
  })
  inflight.set(url, job)
  return job
}

export function useStudioImageEligibility(url: string | undefined): StudioImageEligibility {
  const [state, setState] = useState<StudioImageEligibility>(() => {
    if (!url?.trim()) return 'none'
    return eligibilityCache.get(url) ?? 'pending'
  })

  useEffect(() => {
    if (!url?.trim()) {
      setState('none')
      return
    }
    const cached = eligibilityCache.get(url)
    if (cached && cached !== 'pending') {
      setState(cached)
      return
    }
    let cancelled = false
    setState('pending')
    void analyzeStudioProductImage(url).then((result) => {
      if (!cancelled) setState(result)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return state
}

export function isStudioImageSelectable(eligibility: StudioImageEligibility): boolean {
  return eligibility === 'studio' || eligibility === 'unknown'
}
