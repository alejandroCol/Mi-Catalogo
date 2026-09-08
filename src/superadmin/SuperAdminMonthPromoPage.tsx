import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { MonthPromoCard } from '@/components/billing/MonthPromoCard'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useMcAuth } from '@/auth/McAuthContext'
import { resolvePlanConfig } from '@/lib/billingPlans'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import {
  MONTH_PROMO_DEFAULTS,
  MONTH_PROMO_LIMITS,
  MONTH_PROMO_PREPAID_OPTIONS,
  currentMonthKey,
  formatMonthKeyLabel,
  sanitizeMonthPromo,
  upcomingMonthKeys,
} from '@/lib/monthPromo'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { IconChevronLeft } from '@/icons/McIcons'
import type { McPlatformSettings } from '@/types/mc'

export function SuperAdminMonthPromoPage() {
  const { profile } = useMcAuth()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [monthlyCop, setMonthlyCop] = useState(resolvePlanConfig(null).expertPrecioMensualCop)

  const [enabled, setEnabled] = useState(false)
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const [label, setLabel] = useState<string>(MONTH_PROMO_DEFAULTS.label)
  const [discountPercent, setDiscountPercent] = useState(String(MONTH_PROMO_DEFAULTS.discountPercent))
  const [prepaidMonths, setPrepaidMonths] = useState<number>(MONTH_PROMO_DEFAULTS.prepaidMonths)
  const [hint, setHint] = useState('')

  const monthOptions = useMemo(() => upcomingMonthKeys(), [])

  const load = useCallback(async () => {
    if (!firebaseConfigured) return
    setLoading(true)
    setErr(null)
    try {
      const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
      const data = snap.exists() ? (snap.data() as McPlatformSettings) : {}
      const cfg = resolvePlanConfig(data)
      setMonthlyCop(cfg.expertPrecioMensualCop)
      const raw = data.monthPromo
      setEnabled(raw?.enabled === true)
      setMonthKey(raw?.monthKey && monthOptions.includes(raw.monthKey) ? raw.monthKey : currentMonthKey())
      setLabel(raw?.label?.trim() || MONTH_PROMO_DEFAULTS.label)
      setDiscountPercent(String(raw?.discountPercent ?? MONTH_PROMO_DEFAULTS.discountPercent))
      setPrepaidMonths(raw?.prepaidMonths ?? MONTH_PROMO_DEFAULTS.prepaidMonths)
      setHint(raw?.hint ?? '')
    } catch {
      setErr('No se pudo cargar la promo.')
    } finally {
      setLoading(false)
    }
  }, [monthOptions])

  useEffect(() => {
    if (!isMcSuperAdminUser(profile)) return
    void load()
  }, [profile, load])

  const draft = useMemo(
    () =>
      sanitizeMonthPromo({
        enabled,
        monthKey,
        label,
        discountPercent: Number(discountPercent) || MONTH_PROMO_DEFAULTS.discountPercent,
        prepaidMonths,
        hint,
      }),
    [enabled, monthKey, label, discountPercent, prepaidMonths, hint],
  )

  async function guardar() {
    setBusy(true)
    setMsg(null)
    setErr(null)
    const monthPromo = sanitizeMonthPromo({
      enabled,
      monthKey,
      label,
      discountPercent: Number(discountPercent) || MONTH_PROMO_DEFAULTS.discountPercent,
      prepaidMonths,
      hint,
    })
    try {
      await setDoc(
        doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc),
        {
          monthPromo: monthPromo ?? { enabled: false, updatedAt: Date.now() },
          updatedAt: Date.now(),
        },
        { merge: true },
      )
      setMsg(
        monthPromo
          ? `Promo activa. Ya se ve en /app/plan (${formatMonthKeyLabel(monthPromo.monthKey)}).`
          : 'Promo del mes desactivada. El paywall vuelve a mensual/anual.',
      )
    } catch {
      setErr('No se pudo guardar. Revisá tu sesión de súper admin.')
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
        <h1 className="ios-large-title">Promo del mes</h1>
        <p className="ios-subhead mt-1 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Un card tipo Hot Sale en el paywall. La tienda paga N meses juntos con descuento y después
          sigue al precio mensual normal.
        </p>
      </div>

      {loading ? (
        <p className="ios-subhead text-[var(--cat-muted)]">Cargando…</p>
      ) : (
        <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="mc-card space-y-5">
            <McToggleSwitch
              id="mc-month-promo-enabled"
              checked={enabled}
              disabled={busy}
              onChange={setEnabled}
              label="Mostrar promo en el paywall"
              description="Si está activo y guardás, se ve ahora en /app/plan de las tiendas Free."
            />

            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Mes de la promo</label>
              <select
                className="mc-input mt-1.5"
                value={monthKey}
                disabled={busy}
                onChange={(e) => setMonthKey(e.target.value)}
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthKeyLabel(key)}
                    {key === currentMonthKey() ? ' · ahora' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Label llamativo
              </label>
              <input
                className="mc-input mt-1.5"
                value={label}
                maxLength={MONTH_PROMO_LIMITS.label}
                disabled={busy}
                placeholder="HOT SALE SEPTIEMBRE"
                onChange={(e) => setLabel(e.target.value)}
              />
              <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
                {label.length}/{MONTH_PROMO_LIMITS.label}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                  Descuento %
                </label>
                <input
                  className="mc-input mt-1.5"
                  inputMode="numeric"
                  value={discountPercent}
                  disabled={busy}
                  onChange={(e) => setDiscountPercent(e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
              </div>
              <div>
                <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Meses prepagos</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {MONTH_PROMO_PREPAID_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={busy}
                      onClick={() => setPrepaidMonths(n)}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${
                        prepaidMonths === n
                          ? 'border-mc-900 bg-mc-900 text-white'
                          : 'border-neutral-200 bg-white text-mc-800 hover:border-neutral-300'
                      }`}
                    >
                      {n} meses
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
                Mensajito <span className="font-normal opacity-70">(opcional)</span>
              </label>
              <textarea
                className="mc-input mt-1.5 min-h-[88px]"
                value={hint}
                maxLength={MONTH_PROMO_LIMITS.hint}
                disabled={busy}
                placeholder="Si lo dejás vacío, se genera solo."
                onChange={(e) => setHint(e.target.value)}
              />
            </div>

            {err ? <p className="text-[13px] text-red-800">{err}</p> : null}
            {msg ? <p className="text-[13px] text-[var(--cat-text)]">{msg}</p> : null}

            <button
              type="button"
              className="mc-btn-primary w-full py-3"
              disabled={busy}
              onClick={() => void guardar()}
            >
              {busy ? 'Guardando…' : 'Guardar promo del mes'}
            </button>
          </div>

          <div className="space-y-3">
            <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Vista previa</p>
            {draft ? (
              <MonthPromoCard promo={draft} monthlyCop={monthlyCop} preview />
            ) : (
              <p className="ios-footnote text-[var(--cat-muted)]">Activá la promo para ver el card.</p>
            )}
            <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
              {enabled
                ? 'Activá y guardá: el card aparece ahora en /app/plan. El mes es la etiqueta de la campaña.'
                : 'El interruptor está apagado: las tiendas no ven el card hasta que lo actives y guardes.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
