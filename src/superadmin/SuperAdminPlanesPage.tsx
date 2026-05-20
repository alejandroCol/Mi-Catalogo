import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import {
  DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS,
  DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP,
  DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP,
  DEFAULT_PLAN_FREE_MAX_PRODUCTOS,
  resolvePlanConfig,
} from '@/lib/billingPlans'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { MC } from '@/lib/mcCollections'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import type { McPlatformSettings } from '@/types/mc'
import { IconChevronLeft } from '@/icons/McIcons'

function parsePositiveInt(raw: string): number | null {
  const d = raw.replace(/\D/g, '')
  if (!d) return null
  const n = Number(d)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export function SuperAdminPlanesPage() {
  const { profile } = useMcAuth()
  const [settings, setSettings] = useState<McPlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [freeMax, setFreeMax] = useState(String(DEFAULT_PLAN_FREE_MAX_PRODUCTOS))
  const [expertMax, setExpertMax] = useState(String(DEFAULT_PLAN_EXPERT_MAX_PRODUCTOS))
  const [precioMensual, setPrecioMensual] = useState(
    formatIntegerEsCo(DEFAULT_PLAN_EXPERT_PRECIO_MENSUAL_COP),
  )
  const [precioAnual, setPrecioAnual] = useState(
    formatIntegerEsCo(DEFAULT_PLAN_EXPERT_PRECIO_ANUAL_COP),
  )
  const [expertDisplayName, setExpertDisplayName] = useState('Expert')

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const data = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      setSettings(data)
      const cfg = resolvePlanConfig(data)
      setFreeMax(String(cfg.freeMaxProductos))
      setExpertMax(String(cfg.expertMaxProductos))
      setPrecioMensual(formatIntegerEsCo(cfg.expertPrecioMensualCop))
      setPrecioAnual(formatIntegerEsCo(cfg.expertPrecioAnualCop))
      setExpertDisplayName(data.planExpertDisplayName?.trim() || 'Expert')
    } catch {
      setErr('No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  async function guardar() {
    setBusy(true)
    setMsg(null)
    setErr(null)
    const freeN = parsePositiveInt(freeMax)
    const expertN = parsePositiveInt(expertMax)
    const mensualN = parsePositiveInt(precioMensual)
    const anualN = parsePositiveInt(precioAnual)
    if (freeN == null || freeN < 1 || expertN == null || expertN < 1) {
      setErr('Los límites de productos deben ser enteros mayores a 0.')
      setBusy(false)
      return
    }
    if (expertN <= freeN) {
      setErr('El límite Expert debe ser mayor al límite Free.')
      setBusy(false)
      return
    }
    if (mensualN == null || anualN == null) {
      setErr('Revisá los precios del plan Expert.')
      setBusy(false)
      return
    }
    try {
      const ref = doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)
      const payload = {
        planFreeMaxProductos: freeN,
        planExpertMaxProductos: expertN,
        planExpertPrecioMensualCop: mensualN,
        planExpertPrecioAnualCop: anualN,
        planExpertDisplayName: expertDisplayName.trim() || 'Expert',
        updatedAt: Date.now(),
      }
      const existing = await getDoc(ref)
      if (existing.exists()) {
        await setDoc(ref, payload, { merge: true })
      } else {
        await setDoc(ref, payload)
      }
      setMsg('Configuración de planes guardada.')
      await load()
    } catch {
      setErr('No se pudo guardar. Revisá reglas Firestore (súper admin).')
    } finally {
      setBusy(false)
    }
  }

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mc-shell space-y-8 pb-32">
      <Link
        to="/superadmin"
        className="inline-flex items-center gap-1 text-[15px] font-medium text-mc-900 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-70"
      >
        <IconChevronLeft size={18} />
        Volver al panel
      </Link>

      <div>
        <h1 className="ios-large-title">Configurar planes</h1>
        <p className="ios-subhead mt-1 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Límites de inventario por plan y precios del plan Expert (checkout simulado).
        </p>
      </div>

      {loading ? (
        <p className="ios-subhead text-[var(--cat-muted)]">Cargando…</p>
      ) : (
        <div className="mc-card mx-auto max-w-lg space-y-6">
          <div>
            <p className="ios-headline">Límites de productos</p>
            <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
              Solo Expert puede superar el límite Free. Los valores se aplican en Firestore y en la app.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Máximo plan Free
              </label>
              <input
                className="mc-input mt-1"
                inputMode="numeric"
                value={freeMax}
                disabled={busy}
                onChange={(e) => setFreeMax(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Máximo plan Expert
              </label>
              <input
                className="mc-input mt-1"
                inputMode="numeric"
                value={expertMax}
                disabled={busy}
                onChange={(e) => setExpertMax(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>

          <div className="border-t border-neutral-200/50 pt-5">
            <p className="ios-headline">Precios Expert (COP)</p>
            <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
              Se muestran en <strong className="font-medium text-[var(--cat-text)]">/app/plan</strong> para la
              simulación de compra.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Mensual
              </label>
              <input
                className="mc-input mt-1"
                inputMode="numeric"
                value={precioMensual}
                disabled={busy}
                onChange={(e) => {
                  const n = parsePositiveInt(e.target.value)
                  setPrecioMensual(n != null ? formatIntegerEsCo(n) : '')
                }}
              />
              {precioMensual && (
                <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                  Vista: {formatCop(Number(precioMensual.replace(/\D/g, '')) || 0)}
                </p>
              )}
            </div>
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Anual
              </label>
              <input
                className="mc-input mt-1"
                inputMode="numeric"
                value={precioAnual}
                disabled={busy}
                onChange={(e) => {
                  const n = parsePositiveInt(e.target.value)
                  setPrecioAnual(n != null ? formatIntegerEsCo(n) : '')
                }}
              />
              {precioAnual && (
                <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                  Vista: {formatCop(Number(precioAnual.replace(/\D/g, '')) || 0)}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-neutral-200/50 pt-5">
            <p className="ios-headline">Nombre del plan Expert</p>
            <input
              className="mc-input mt-2"
              value={expertDisplayName}
              disabled={busy}
              onChange={(e) => setExpertDisplayName(e.target.value)}
            />
          </div>

          <Link
            to="/superadmin/descuentos"
            className="block text-center text-[13px] font-medium underline decoration-neutral-300 underline-offset-4"
          >
            Gestionar códigos de descuento →
          </Link>

          {settings?.updatedAt && (
            <p className="ios-footnote text-[var(--cat-muted)]">
              Última actualización:{' '}
              {new Date(settings.updatedAt).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}

          {err && <p className="text-[13px] text-red-800">{err}</p>}
          {msg && <p className="text-[13px] text-[var(--cat-text)]">{msg}</p>}

          <button type="button" className="mc-btn-primary w-full py-3" disabled={busy} onClick={() => void guardar()}>
            {busy ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      )}
    </div>
  )
}
