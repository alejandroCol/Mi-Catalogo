/**
 * Reduce peso y tamaño en píxeles antes de subir a Storage (JPEG ~82% calidad, borde máx. 1600px).
 * Si la compresión falla o no mejora el peso, devuelve el archivo original.
 */

const MAX_EDGE_PX = 1600
const JPEG_QUALITY = 0.82

export type CompressImageOptions = {
  /** Borde largo máximo en px (por defecto 1600). */
  maxEdgePx?: number
  /** Calidad JPEG 0–1 (por defecto ~0.82). */
  jpegQuality?: number
}

async function fileToImageBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      return await new Promise<ImageBitmap | null>((resolve) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
          URL.revokeObjectURL(url)
          createImageBitmap(img)
            .then((b) => resolve(b))
            .catch(() => resolve(null))
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(null)
        }
        img.src = url
      })
    }
  }
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number) {
  const long = Math.max(width, height)
  if (long <= maxEdge) return { w: width, h: height }
  const s = maxEdge / long
  return { w: Math.max(1, Math.round(width * s)), h: Math.max(1, Math.round(height * s)) }
}

/**
 * @returns `File` JPEG listo para `uploadBytes` (nombre `.jpg`).
 */
export async function compressImageForUpload(
  file: File,
  opts?: CompressImageOptions,
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const maxEdge = opts?.maxEdgePx ?? MAX_EDGE_PX
  const jpegQuality = opts?.jpegQuality ?? JPEG_QUALITY

  const bitmap = await fileToImageBitmap(file)
  if (!bitmap) {
    return file
  }

  try {
    const { width, height } = bitmap
    const { w, h } = scaleToMaxEdge(width, height, maxEdge)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', jpegQuality)
    })

    if (!blob || blob.size === 0) {
      return file
    }

    // Si ya era JPEG pequeño y el resultado es más pesado, conservar original
    if (blob.size > file.size && file.size < 350_000 && file.type === 'image/jpeg') {
      return file
    }
    if (blob.size > file.size * 1.05) {
      return file
    }

    const stem = file.name.replace(/\.[^.]+$/i, '') || 'producto'
    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } finally {
    bitmap.close()
  }
}
