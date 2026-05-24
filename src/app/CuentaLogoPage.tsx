import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { deleteField, doc, updateDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { billingPlanOf } from '@/lib/catalogTheme'
import { compressImageForUpload } from '@/lib/compressImageForUpload'
import { firebaseStorageConfigured, getDb, getStorageApp } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

const LOGO_STORAGE_PATH = (tenantId: string) => `mc_tenants/${tenantId}/logo/store.jpg`

export function CuentaLogoPage() {
  const { profile, tenant } = useMcAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const plan = tenant ? billingPlanOf(tenant) : 'free'

  useEffect(() => {
    setPreviewUrl(tenant?.storeLogoUrl ?? null)
  }, [tenant?.storeLogoUrl])

  async function onPickLogo(file: File | null) {
    if (!file || !profile?.tenantId || !tenant || plan !== 'expert') return
    if (!firebaseStorageConfigured) {
      setMsg('Firebase Storage no está configurado.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const optimized = await compressImageForUpload(file, { maxEdgePx: 512, jpegQuality: 0.88 })
      const storage = getStorageApp()
      const pathRef = ref(storage, LOGO_STORAGE_PATH(profile.tenantId))
      await uploadBytes(pathRef, optimized, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(pathRef)
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { storeLogoUrl: url })
      setPreviewUrl(url)
      showSaveSuccess({
        title: 'Logo actualizado',
        message: 'Ya se ve en tu catálogo público.',
      })
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
      if (code === 'storage/unauthorized') {
        setMsg('Permiso denegado en Storage. Reintentá en unos segundos o volvé a iniciar sesión.')
      } else {
        setMsg('No se pudo subir el logo. Revisá conexión e intentá de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function quitarLogo() {
    if (!profile?.tenantId || !tenant?.storeLogoUrl) return
    setBusy(true)
    setMsg(null)
    try {
      if (firebaseStorageConfigured) {
        try {
          await deleteObject(ref(getStorageApp(), LOGO_STORAGE_PATH(profile.tenantId)))
        } catch {
          /* archivo ya ausente */
        }
      }
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { storeLogoUrl: deleteField() })
      setPreviewUrl(null)
      showSaveSuccess({
        title: 'Logo quitado',
        message: 'Tu catálogo ya no muestra logo personalizado.',
      })
    } catch {
      setMsg('No se pudo quitar el logo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3">Logo de tienda</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Un detalle sobrio en la cabecera de tu catálogo. Solo disponible en plan Expert.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : plan !== 'expert' ? (
        <div className="mc-card space-y-4">
          <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
            El logo de tienda está incluido en el plan <strong className="font-medium">Expert</strong>.
          </p>
          <Link
            to="/app/plan"
            className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px] no-underline"
          >
            Ver planes y pasar a Expert
          </Link>
        </div>
      ) : (
        <div className="mc-card space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] shadow-sm">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="ios-footnote text-center leading-tight text-[var(--cat-muted)] px-2">
                  Sin logo
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
              <p className="ios-subhead leading-relaxed text-[var(--cat-text)]">
                Se muestra como un círculo pequeño junto al nombre de{' '}
                <strong className="font-medium">{tenant.nombreTienda}</strong> en el catálogo público.
              </p>
              <p className="ios-footnote text-[var(--cat-muted)]">
                Recomendado: imagen cuadrada, fondo neutro o transparente. Se optimiza automáticamente al subir.
              </p>
            </div>
          </div>

          <div>
            <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
              Subir logo
            </label>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              className="mt-1.5 w-full text-[15px] text-mc-600 file:mr-3 file:rounded-md file:border file:border-neutral-200/70 file:bg-neutral-50 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-mc-900"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                e.target.value = ''
                void onPickLogo(f)
              }}
            />
          </div>

          {previewUrl && (
            <button
              type="button"
              className="mc-btn-secondary w-full py-3 text-[15px]"
              disabled={busy}
              onClick={() => void quitarLogo()}
            >
              Quitar logo
            </button>
          )}

          {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        </div>
      )}
    </div>
  )
}
