import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

export function CuentaResumenVentasPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'fortnight'>('week')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!tenant) return
    setSalesPeriod(tenant.salesSummaryPeriod === 'fortnight' ? 'fortnight' : 'week')
  }, [tenant])

  async function guardar() {
    if (!effectiveTenantId) return
    setBusy(true)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { salesSummaryPeriod: salesPeriod })
      showSaveSuccess({ message: 'El período del resumen de ventas se actualizó.' })
    } catch {
      setErr('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="Resumen de ventas">
      <div className="mc-card space-y-4">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          El segundo monto del inicio suma el <strong className="font-medium text-[var(--cat-text)]">Total COP</strong>{' '}
          de ventas del catálogo (sin pagos pendientes ni canceladas) y de pedidos manuales en el período elegido.
        </p>
        <div>
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Período</label>
          <select
            className="mc-input py-3"
            value={salesPeriod}
            disabled={busy}
            onChange={(e) => setSalesPeriod(e.target.value as 'week' | 'fortnight')}
          >
            <option value="week">Semana calendario (lunes a domingo)</option>
            <option value="fortnight">Quincena del mes (días 1–15 o 16 al fin)</option>
          </select>
        </div>
        {err && <p className="text-[15px] text-red-800">{err}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar
        </button>
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
