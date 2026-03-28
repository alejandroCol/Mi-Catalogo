import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getAuthApp, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  billingPlanOf,
  buildCatalogThemeForSave,
  defaultColorsForPreset,
} from '@/lib/catalogTheme'
import { isSubscriptionActive } from '@/lib/subscription'
import { CatalogPresetPickerGrid } from '@/app/CatalogPresetPickerGrid'
import { PublicCatalogThemePreview } from '@/app/PublicCatalogThemePreview'
import type { McCatalogThemePreset } from '@/types/mc'

const HEX = /^#[0-9A-Fa-f]{6}$/

export function CuentaPage() {
  const { profile, tenant, firebaseUser } = useMcAuth()
  const [wa, setWa] = useState('')
  const [intro, setIntro] = useState('')
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'fortnight'>('week')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [preset, setPreset] = useState<McCatalogThemePreset>('morning')
  const [cAccent, setCAccent] = useState('')
  const [cAccentText, setCAccentText] = useState('')
  const [cBg, setCBg] = useState('')
  const [cSurface, setCSurface] = useState('')
  const [cText, setCText] = useState('')
  const [cMuted, setCMuted] = useState('')

  useEffect(() => {
    if (!tenant) return
    setWa(tenant.whatsappNumero ?? '')
    setIntro(tenant.mensajeIntro ?? '')
    setSalesPeriod(tenant.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week')
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

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const digits = wa.replace(/\D/g, '')
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        whatsappNumero: digits,
        mensajeIntro: intro.trim() || '',
        salesSummaryPeriod: salesPeriod,
      })
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  async function guardarTema() {
    if (!profile?.tenantId || !tenant || billingPlanOf(tenant) !== 'expert') return
    setBusy(true)
    setMsg(null)
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
      setMsg('Tema actualizado (catálogo público y panel).')
    } catch {
      setMsg('No se pudo guardar el tema.')
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

  async function salir() {
    if (!firebaseConfigured) return
    await signOut(getAuthApp())
  }

  const active = tenant ? isSubscriptionActive(tenant.subscriptionEndsAt) : false
  const plan = tenant ? billingPlanOf(tenant) : 'free'

  return (
    <div className="mc-shell space-y-5">
      <h1 className="ios-large-title">Cuenta</h1>

      {!active && (
        <p className="rounded-[10px] border border-ios-orange/35 bg-ios-orange/10 px-4 py-3 ios-footnote text-[var(--cat-text)]">
          Membresía vencida. Contactá soporte o pedí extensión al súper admin.
        </p>
      )}

      {tenant && (
        <>
          {plan === 'free' ? (
            <Link
              to="/app/plan"
              className="mc-card flex flex-wrap items-center gap-2 transition active:opacity-90"
            >
              <span className="ios-footnote font-medium">Plan producto:</span>
              <span className="rounded-full bg-mc-100 px-2.5 py-1 text-[12px] font-semibold text-mc-700">Free</span>
              <span className="w-full ios-footnote text-[var(--cat-muted)]">
                Tocá para ver <strong className="font-semibold text-[var(--cat-text)]">Expert</strong> (mensual o anual,
                pago simulado por ahora). Con Expert elegís plantillas y colores del catálogo.
              </span>
            </Link>
          ) : (
            <div className="mc-card flex flex-wrap items-center gap-2">
              <span className="ios-footnote font-medium">Plan producto:</span>
              <span className="rounded-full bg-ios-green/15 px-2.5 py-1 text-[12px] font-semibold text-ios-green">
                Expert
              </span>
            </div>
          )}

          <div className="mc-card space-y-4">
            <p className="ios-subhead">
              Tienda: <strong className="font-semibold text-[var(--cat-text)]">{tenant.nombreTienda}</strong>
            </p>
            <p className="ios-subhead">
              URL:{' '}
              <Link to={`/c/${tenant.slug}`} className="font-semibold text-[var(--cat-accent)]">
                /c/{tenant.slug}
              </Link>
            </p>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                WhatsApp (solo dígitos, código país)
              </label>
              <input className="mc-input" value={wa} onChange={(e) => setWa(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Mensaje intro pedido WhatsApp
              </label>
              <textarea className="mc-input min-h-[88px] resize-y" value={intro} onChange={(e) => setIntro(e.target.value)} />
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Resumen de ventas en el inicio (2.º monto)
              </label>
              <select
                className="mc-input py-3"
                value={salesPeriod}
                disabled={busy}
                onChange={(e) => setSalesPeriod(e.target.value as 'week' | 'fortnight')}
              >
                <option value="week">Semana calendario (lunes a domingo)</option>
                <option value="fortnight">Quincena del mes (días 1–15 o 16 al fin)</option>
              </select>
              <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                Se suman los <strong className="font-medium text-[var(--cat-text)]">Total COP</strong> de los pedidos en
                ese período.
              </p>
            </div>
            {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
            <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
              Guardar cambios
            </button>
          </div>

          {plan === 'expert' && (
            <div className="mc-card space-y-4">
              <div>
                <p className="ios-headline">Tema · Expert</p>
                <p className="ios-subhead mt-1">
                  Elegí <strong>cómo se ve el catálogo</strong>: cada plantilla tiene un layout distinto (lista, cuadrícula,
                  vidriera, fotos grandes…). Los colores del panel siguen el tema. Guardá para publicar en{' '}
                  <Link to={`/c/${tenant.slug}`} className="font-semibold text-[var(--cat-accent)]">
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
                        placeholder="#007AFF"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        maxLength={7}
                      />
                      <input
                        type="color"
                        className="h-11 w-14 cursor-pointer rounded-[10px] border-0 bg-transparent p-0"
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
              <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardarTema()}>
                Guardar tema del panel
              </button>
            </div>
          )}
        </>
      )}

      <button
        type="button"
        className="w-full rounded-[12px] border border-ios-red/35 bg-[var(--cat-surface)] py-3.5 text-[17px] font-semibold text-ios-red active:opacity-80"
        onClick={() => void salir()}
      >
        Cerrar sesión
      </button>
      <p className="text-center ios-footnote">{firebaseUser?.email}</p>
    </div>
  )
}
