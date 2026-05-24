import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ExpertStar } from '@/components/billing/ExpertStar'
import { hasExpertFeatureAccess } from '@/lib/billingAccess'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { buildCatalogThemeForSave, defaultColorsForPreset } from '@/lib/catalogTheme'
import { CatalogPresetPickerGrid } from '@/app/CatalogPresetPickerGrid'
import { PublicCatalogThemePreview } from '@/app/PublicCatalogThemePreview'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import type { McCatalogThemePreset } from '@/types/mc'

const HEX = /^#[0-9A-Fa-f]{6}$/

export function CuentaEstiloPage() {
  const { profile, tenant } = useMcAuth()
  const nav = useNavigate()
  const expertAccess = hasExpertFeatureAccess(tenant)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  const [preset, setPreset] = useState<McCatalogThemePreset>('morning')
  const [cAccent, setCAccent] = useState('')
  const [cAccentText, setCAccentText] = useState('')
  const [cBg, setCBg] = useState('')
  const [cSurface, setCSurface] = useState('')
  const [cText, setCText] = useState('')
  const [cMuted, setCMuted] = useState('')

  useEffect(() => {
    if (!tenant) return
    const p = tenant.catalogTheme?.preset ?? 'morning'
    setPreset(p)
    const cols = tenant.catalogTheme?.colors
    setCAccent(cols?.accent ?? '')
    setCAccentText(cols?.accentText ?? '')
    setCBg(cols?.bg ?? '')
    setCSurface(cols?.surface ?? '')
    setCText(cols?.text ?? '')
    setCMuted(cols?.muted ?? '')
  }, [tenant])

  async function guardarTema() {
    if (!profile?.tenantId || !tenant) return
    if (!expertAccess) {
      nav('/app/plan')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const colors = {
        ...(HEX.test(cAccent) ? { accent: cAccent } : {}),
        ...(HEX.test(cAccentText) ? { accentText: cAccentText } : {}),
        ...(HEX.test(cBg) ? { bg: cBg } : {}),
        ...(HEX.test(cSurface) ? { surface: cSurface } : {}),
        ...(HEX.test(cText) ? { text: cText } : {}),
        ...(HEX.test(cMuted) ? { muted: cMuted } : {}),
      }
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        catalogTheme: buildCatalogThemeForSave(preset, colors),
      })
      showSaveSuccess({
        title: 'Tema actualizado',
        message: 'Los cambios ya se ven en tu catálogo público y en el panel.',
      })
    } catch {
      setErr('No se pudo guardar el tema.')
    } finally {
      setBusy(false)
    }
  }

  function onPresetChange(next: McCatalogThemePreset) {
    setPreset(next)
    const c = defaultColorsForPreset(next)
    setCAccent(c.accent)
    setCAccentText(c.accentText)
    setCBg(c.bg)
    setCSurface(c.surface)
    setCText(c.text)
    setCMuted(c.muted)
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3">Estilo del portal de venta</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Definí cómo se ve tu catálogo público: plantilla, colores y vista previa antes de publicar.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="mc-card space-y-6">
          {!expertAccess && (
            <p className="ios-footnote border border-neutral-200/60 bg-neutral-50/50 px-3 py-2">
              <ExpertStar className="mr-1 inline" /> Función Expert —{' '}
              <Link to="/app/plan" className="font-medium underline">activá tu plan</Link> para guardar.
            </p>
          )}
          <div>
            <p className="ios-headline inline-flex items-center gap-1.5"><ExpertStar />Tema del catálogo</p>
            <p className="ios-subhead mt-2 leading-relaxed">
              Elegí <strong className="font-medium text-[var(--cat-text)]">cómo se ve el catálogo</strong>: cada plantilla
              tiene un layout distinto (lista, cuadrícula, vidriera, fotos grandes…). Los colores del panel siguen el tema.
              Guardá para publicar en{' '}
              <Link
                to={`/c/${tenant.slug}`}
                className="font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
              >
                tu URL pública
              </Link>
              .
            </p>
          </div>
          <div>
            <p className="ios-footnote mb-2 font-medium text-[var(--cat-text)] opacity-80">Plantilla del catálogo</p>
            <CatalogPresetPickerGrid value={preset} disabled={busy} onChange={onPresetChange} />
            <p className="ios-footnote mt-2 text-[var(--cat-muted)]">
              Al tocar una plantilla se aplican sus colores por defecto; podés afinarlos abajo antes de guardar.
            </p>
          </div>
          <PublicCatalogThemePreview
            tenant={tenant}
            preset={preset}
            cAccent={cAccent}
            cAccentText={cAccentText}
            cBg={cBg}
            cSurface={cSurface}
            cText={cText}
            cMuted={cMuted}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ['Acento (botones)', cAccent, setCAccent],
                ['Texto sobre acento', cAccentText, setCAccentText],
                ['Fondo página', cBg, setCBg],
                ['Tarjetas / cabecera', cSurface, setCSurface],
                ['Texto principal', cText, setCText],
                ['Texto secundario', cMuted, setCMuted],
              ] as const
            ).map(([label, val, setVal]) => (
              <div key={label}>
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">{label}</label>
                <div className="mt-1 flex gap-2">
                  <input
                    className="mc-input flex-1 py-2 font-mono text-[14px]"
                    placeholder="#171717"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    maxLength={7}
                  />
                  <input
                    type="color"
                    className="h-11 w-14 cursor-pointer rounded-md border border-neutral-200/50 bg-transparent p-0"
                    aria-label={label}
                    value={HEX.test(val) ? val : '#000000'}
                    onChange={(e) => setVal(e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="ios-footnote text-[var(--cat-muted)]">
            Dejá un campo vacío o borrá el hex para volver al valor de la plantilla en ese color.
          </p>
          {err && <p className="text-[15px] text-red-800">{err}</p>}
          <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardarTema()}>
            Guardar tema del panel
          </button>
        </div>
      )}
    </div>
  )
}
