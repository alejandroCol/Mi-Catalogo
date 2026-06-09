import { useEffect, useState } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { StoreLogoImagePicker } from '@/components/storeLogo/StoreLogoImagePicker'
import { firebaseStorageConfigured } from '@/lib/firebase'
import { mapStoreLogoError, removeStoreLogo, uploadStoreLogo } from '@/lib/storeLogo'

export function CuentaLogoPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (uploading) return
    setPreviewUrl(tenant?.storeLogoUrl ?? null)
  }, [tenant?.storeLogoUrl, uploading])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const displayUrl = localPreviewUrl ?? previewUrl

  function clearLocalPreview() {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(null)
    }
  }

  async function onPickLogo(file: File) {
    if (!effectiveTenantId || !tenant) return
    if (!firebaseStorageConfigured) {
      setMsg('Firebase Storage no está configurado.')
      return
    }

    clearLocalPreview()
    setLocalPreviewUrl(URL.createObjectURL(file))
    setMsg(null)
    setUploading(true)

    try {
      const { url } = await uploadStoreLogo(effectiveTenantId, file)
      setPreviewUrl(url)
      clearLocalPreview()
      showSaveSuccess({
        title: 'Logo guardado',
        message: 'Tu logo ya está visible en el catálogo.',
      })
    } catch (err: unknown) {
      clearLocalPreview()
      setMsg(mapStoreLogoError(err))
    } finally {
      setUploading(false)
    }
  }

  async function quitarLogo() {
    if (!effectiveTenantId || !tenant) return
    if (!tenant.storeLogoUrl && !previewUrl) return

    setMsg(null)
    setUploading(true)

    try {
      await removeStoreLogo(effectiveTenantId, tenant.storeLogoUrl ?? previewUrl)
      clearLocalPreview()
      setPreviewUrl(null)
      showSaveSuccess({
        title: 'Logo quitado',
        message: 'Tu catálogo ya no muestra logo personalizado.',
      })
    } catch (err: unknown) {
      setMsg(mapStoreLogoError(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3">Logo de tienda</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Un detalle sobrio en la cabecera de tu catálogo.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="mc-card space-y-6">
          <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
            Se muestra junto al nombre de <strong className="font-medium">{tenant.nombreTienda}</strong> en el catálogo.
            Al elegir una imagen se guarda automáticamente.
          </p>

          <StoreLogoImagePicker
            tenant={tenant}
            previewUrl={displayUrl}
            disabled={uploading}
            uploading={uploading}
            onPick={onPickLogo}
            onRemove={() => void quitarLogo()}
          />

          {msg && (
            <p className="rounded-lg border border-red-200/70 bg-red-50/80 px-3 py-2 text-[14px] leading-relaxed text-red-800">
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
