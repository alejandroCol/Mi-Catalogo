import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { billingPlanOf } from '@/lib/catalogTheme'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

const MS_DAY = 24 * 60 * 60 * 1000

export function PlanUpgradePage() {
  const { profile, tenant } = useMcAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const plan = tenant ? billingPlanOf(tenant) : 'free'

  async function comprarMock(period: 'month' | 'year') {
    if (!profile?.tenantId || !tenant || !firebaseConfigured) return
    if (plan !== 'free') {
      setMsg('Ya tenés Expert activo.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const base = Math.max(Date.now(), tenant.subscriptionEndsAt)
      const extra = period === 'year' ? 365 * MS_DAY : 30 * MS_DAY
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        billingPlan: 'expert',
        subscriptionEndsAt: base + extra,
      })
      setMsg(
        period === 'year'
          ? 'Plan Expert (simulado) activado por 1 año. Cuando conectemos el cobro real, este paso cobrará de verdad.'
          : 'Plan Expert (simulado) activado por 1 mes. Cuando conectemos el cobro real, este paso cobrará de verdad.',
      )
    } catch {
      setMsg('No se pudo aplicar el cambio. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell space-y-5">
      <div>
        <Link to="/app/cuenta" className="ios-footnote font-medium text-[var(--cat-accent)]">
          ← Cuenta
        </Link>
        <h1 className="ios-large-title mt-2">Plan Expert</h1>
        <p className="ios-subhead mt-1.5">
          Elegí facturación mensual o anual. Por ahora es una <strong className="font-semibold text-[var(--cat-text)]">simulación</strong> de
          pago; luego conectaremos la pasarela real.
        </p>
      </div>

      {plan === 'expert' ? (
        <p className="rounded-[10px] border border-ios-green/35 bg-ios-green/10 px-4 py-3 ios-footnote text-[var(--cat-text)]">
          Ya estás en <strong className="font-semibold">Expert</strong>. Podés volver a Cuenta para editar el tema del catálogo.
        </p>
      ) : (
        <>
          <div className="mc-card space-y-3">
            <p className="ios-headline">Expert mensual</p>
            <p className="ios-subhead">Plantillas de catálogo, colores personalizados y panel alineado al tema.</p>
            <p className="text-[15px] font-semibold text-[var(--cat-text)]">$29.900 COP / mes (demo)</p>
            <button
              type="button"
              className="mc-btn-primary w-full"
              disabled={busy}
              onClick={() => void comprarMock('month')}
            >
              {busy ? 'Procesando…' : 'Simular compra mensual'}
            </button>
          </div>
          <div className="mc-card space-y-3">
            <p className="ios-headline">Expert anual</p>
            <p className="ios-subhead">Mismo beneficio con mejor precio relativo (valores de ejemplo).</p>
            <p className="text-[15px] font-semibold text-[var(--cat-text)]">$299.000 COP / año (demo)</p>
            <button
              type="button"
              className="mc-btn-secondary w-full"
              disabled={busy}
              onClick={() => void comprarMock('year')}
            >
              {busy ? 'Procesando…' : 'Simular compra anual'}
            </button>
          </div>
        </>
      )}

      {msg && <p className="ios-footnote text-[var(--cat-text)]">{msg}</p>}

      <Link to="/app/cuenta" className="block text-center ios-footnote font-medium text-[var(--cat-accent)]">
        Volver a Cuenta
      </Link>
    </div>
  )
}
