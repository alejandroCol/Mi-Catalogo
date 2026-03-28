import { getBlob, ref, type FirebaseStorage } from 'firebase/storage'

function triggerDownloadBlob(blob: Blob, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function storageRefFromPublicUrl(storage: FirebaseStorage, url: string) {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('firebasestorage.googleapis.com')) return null
    const m = /^\/v0\/b\/[^/]+\/o\/(.+)$/.exec(u.pathname)
    if (!m) return null
    const objectPath = decodeURIComponent(m[1].replace(/\+/g, ' '))
    return ref(storage, objectPath)
  } catch {
    return null
  }
}

export type DownloadCatalogImageOptions = {
  getFirebaseStorage?: () => FirebaseStorage | null
}

export async function downloadCatalogImage(
  url: string,
  filename: string,
  options?: DownloadCatalogImageOptions,
): Promise<boolean> {
  const storage = options?.getFirebaseStorage?.() ?? null
  if (storage) {
    try {
      const sref = storageRefFromPublicUrl(storage, url)
      if (sref) {
        const blob = await getBlob(sref)
        triggerDownloadBlob(blob, filename)
        return true
      }
    } catch {
      /* siguiente método */
    }
  }

  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) throw new Error('fetch')
    const blob = await res.blob()
    triggerDownloadBlob(blob, filename)
    return true
  } catch {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    return Boolean(w)
  }
}
