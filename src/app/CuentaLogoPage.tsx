import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { ExpertUpgradeSheet } from '@/components/billing/ExpertUpgradeSheet'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { StoreLogoImagePicker } from '@/components/storeLogo/StoreLogoImagePicker'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

const LOGO_STORAGE_PATH = (tenantId: string) => `mc_tenants/${tenantId}/logo/store.jpg`

export function CuentaLogoPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const expertAccess = hasExpertFeatureAccess(tenant)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [expertSheetOpen, setExpertSheetOpen] = useState(false)
  const { showSaveSuccess } = useSaveSuccess()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [removePending, setRemovePending] = useState(false)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (pendingFile || removePending) return
    setPreviewUrl(tenant?.storeLogoUrl ?? null)
  }, [tenant?.storeLogoUrl, pendingFile, removePending])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const displayUrl = removePending ? localPreviewUrl : (localPreviewUrl ?? previewUrl)

  function onPickLogo(file: File) {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    const url = URL.createObjectURL(file)
    setLocalPreviewUrl(url)
    setPendingFile(file)
    setRemovePending(false)
    setMsg(null)
  }

  function quitarLogo() {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(null)
    }
    setPendingFile(null)
    setRemovePending(true)
    setMsg(null)
  }

  const hasChanges = pendingFile !== null || removePending

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    if (!expertAccess) {
      setExpertSheetOpen(true)
      return
    }
    if (!hasChanges) {
      setMsg('No hay cambios para guardar.')
      return
    }
    if (!firebaseStorageConfigured && (pendingFile || (removePending && tenant.storeLogoUrl))) {
      setMsg('Firebase Storage no está configurado.')
      return
    }

    setBusy(true)
    setMsg(null)
    try {
      if (removePending) {
        if (firebaseStorageConfigured && tenant.storeLogoUrl) {
          try {
            await deleteObject(ref(getStorageApp(), LOGO_STORAGE_PATH(effectiveTenantId)))
          } catch {
            /* archivo ya ausente */
          }
        }
        await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { storeLogoUrl: deleteField() })
        setPreviewUrl(null)
        setRemovePending(false)
        showSaveSuccess({
          title: 'Logo quitado',
          message: 'Tu catálogo ya no muestra logo personalizado.',
        })
      } else if (pendingFile) {
        const optimized = await compressImageForUpload(pendingFile, { maxEdgePx: 512, jpegQuality: 0.88 })
        const storage = getStorageApp()
        const pathRef = ref(storage, LOGO_STORAGE_PATH(effectiveTenantId))
        await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
        const url = await getDownloadURL(pathRef)
        await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { storeLogoUrl: url })
        setPreviewUrl(url)
        showSaveSuccess({
          title: 'Logo actualizado',
          message: 'Ya se ve en tu catálogo público.',
        })
      }
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
        setLocalPreviewUrl(null)
      }
      setPendingFile(null)
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
      if (code === 'storage/unauthorized') {
        setMsg('Permiso denegado en Storage. Reintentá en unos segundos o volvé a iniciar sesión.')
      } else {
        setMsg('No se pudo guardar el logo. Revisá conexión e intentá de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3 inline-flex items-center gap-2">
          <ExpertStar />
          Logo de tienda
        </h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Un detalle sobrio en la cabecera de tu catálogo. Incluido en plan Expert.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="mc-card space-y-6">
          {!expertAccess && (
            <p className="ios-footnote border border-neutral-200/60 bg-neutral-50/50 px-3 py-2">
              <ExpertStar className="mr-1 inline" /> Función Expert —{' '}
              <Link to="/app/plan" className="font-medium underline">
                activá tu plan
              </Link>{' '}
              para guardar.
            </p>
          )}

          <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
            Se muestra junto al nombre de <strong className="font-medium">{tenant.nombreTienda}</strong> en el catálogo
            público.
          </p>

          <StoreLogoImagePicker
            previewUrl={displayUrl}
            disabled={busy}
            onPick={onPickLogo}
            onRemove={quitarLogo}
          />

          {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}

          <button
            type="button"
            className="mc-btn-primary w-full py-3 text-[15px]"
            disabled={busy || !hasChanges}
            onClick={() => void guardar()}
          >
            {busy ? 'Guardando…' : 'Guardar logo'}
          </button>
        </div>
      )}

      <ExpertUpgradeSheet
        open={expertSheetOpen}
        onClose={() => setExpertSheetOpen(false)}
        title="Logo de tienda — Plan Expert"
      />
    </div>
  )
}
