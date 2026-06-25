export const POS_BRIDGE_INSTALLER_VERSION = '1.0.2'
export const POS_BRIDGE_INSTALLER_FILENAME = 'micatalogo-pos-bridge-win.zip'

export function resolvePosBridgeInstallerUrl(tenantUrl?: string | null): string {
  const fromTenant = tenantUrl?.trim()
  if (fromTenant) return fromTenant
  const base = import.meta.env.BASE_URL ?? '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}downloads/${POS_BRIDGE_INSTALLER_FILENAME}`
}

export async function triggerPosBridgeDownload(
  url: string,
  filename = POS_BRIDGE_INSTALLER_FILENAME,
) {
  const sameOrigin =
    typeof window !== 'undefined' &&
    (url.startsWith('/') || url.startsWith(window.location.origin))

  if (sameOrigin) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return
  }

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
