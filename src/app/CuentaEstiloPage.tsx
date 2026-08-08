import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { ADMIN_CATALOG_PREVIEW_BASE } from '@/app/AdminCatalogPreviewLayout'
import { buildCatalogThemeForSave, defaultColorsForPreset } from '@/lib/catalogTheme'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import { CatalogPresetPickerGrid } from '@/app/CatalogPresetPickerGrid'
import { PublicCatalogThemePreview } from '@/app/PublicCatalogThemePreview'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import type { McCatalogButtonShape, McCatalogThemePreset } from '@/types/mc'

const HEX = /^#[0-9A-Fa-f]{6}$/

export function CuentaEstiloPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  const [preset, setPreset] = useState<McCatalogThemePreset>('morning')
  const [buttonShape, setButtonShape] = useState<McCatalogButtonShape>('pill')
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
    setButtonShape(tenant.catalogTheme?.buttonShape === 'square' ? 'square' : 'pill')
    const cols = tenant.catalogTheme?.colors
    setCAccent(cols?.accent ?? '')
    setCAccentText(cols?.accentText ?? '')
    setCBg(cols?.bg ?? '')
    setCSurface(cols?.surface ?? '')
    setCText(cols?.text ?? '')
    setCMuted(cols?.muted ?? '')
  }, [tenant])

  async function guardarTema() {
    if (!effectiveTenantId || !tenant) return
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
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        catalogTheme: buildCatalogThemeForSave(preset, colors, tenant.catalogTheme, buttonShape),
      })
      showSaveSuccess({
        title: 'Tema actualizado',
        message: 'Los cambios ya se ven en tu catálogo y en la vista previa.',
      })
    } catch (saveErr: unknown) {
      setErr(productSaveErrorMessage(saveErr, 'No se pudo guardar el tema.'))
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
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3">Estilo del portal de venta</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Definí cómo se ve tu catálogo: plantilla, botones, colores y vista previa antes de publicar.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="mc-card space-y-6">
          <div>
            <p className="ios-headline">Tema del catálogo</p>
            <p className="ios-subhead mt-2 leading-relaxed">
              Elegí <strong className="font-medium text-[var(--cat-text)]">cómo se ve el catálogo</strong>: cada plantilla
              tiene un layout distinto (lista, cuadrícula, vidriera, fotos grandes…). Los colores del panel siguen el tema.
              Miralo en{' '}
              <Link
                to={ADMIN_CATALOG_PREVIEW_BASE}
                className="font-medium text-[var(--cat-text)] underline decoration-neutral-300 underline-offset-4"
              >
                vista previa
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

          <div>
            <p className="ios-footnote mb-2 font-medium text-[var(--cat-text)] opacity-80">Forma de los botones</p>
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              {(
                [
                  { id: 'pill' as const, label: 'Redondos', hint: 'Como hoy' },
                  { id: 'square' as const, label: 'Cuadrados', hint: 'Esquinas suaves' },
                ] as const
              ).map((opt) => {
                const selected = buttonShape === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={busy}
                    onClick={() => setButtonShape(opt.id)}
                    className={clsx(
                      'flex flex-col items-start gap-2 border px-3 py-3 text-left transition',
                      selected
                        ? 'border-[var(--cat-text)] bg-[color-mix(in_srgb,var(--cat-text)_4%,white)]'
                        : 'border-neutral-200/80 hover:border-neutral-300',
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-flex h-8 w-full max-w-[7.5rem] items-center justify-center bg-neutral-900 text-[11px] font-semibold text-white',
                        opt.id === 'pill' ? 'rounded-full' : 'rounded-md',
                      )}
                    >
                      Botón
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-[var(--cat-text)]">{opt.label}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--cat-muted)]">{opt.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <PublicCatalogThemePreview
            tenant={tenant}
            preset={preset}
            buttonShape={buttonShape}
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
