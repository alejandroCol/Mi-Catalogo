import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { normalizeCuponCodigo } from '@/lib/checkoutPricing'
import type { McCuponTienda } from '@/types/mc'

export function CuentaCuponesPage() {
  const { profile, tenant } = useMcAuth()
  const [cupones, setCupones] = useState<McCuponTienda[]>([])
  const [nuevoCuponCodigo, setNuevoCuponCodigo] = useState('')
  const [nuevoCuponTipo, setNuevoCuponTipo] = useState<'porcentaje' | 'monto_fijo'>('porcentaje')
  const [nuevoCuponValor, setNuevoCuponValor] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    const rawCupones = tenant.cuponesCatalogo ?? []
    setCupones(
      rawCupones.map((c, i) => ({
        id: c.id || `c-${i}-${c.codigo}`,
        codigo: String(c.codigo ?? ''),
        tipo: c.tipo === 'monto_fijo' ? 'monto_fijo' : 'porcentaje',
        valor: typeof c.valor === 'number' && Number.isFinite(c.valor) ? c.valor : 0,
        activo: c.activo !== false,
      })),
    )
  }, [tenant])

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const cuponesValidos = cupones.filter((c) => normalizeCuponCodigo(c.codigo))
      const seen = new Set<string>()
      for (const c of cuponesValidos) {
        const k = normalizeCuponCodigo(c.codigo)
        if (seen.has(k)) {
          setMsg('Hay códigos de cupón repetidos. Unificá o borrá duplicados.')
          setBusy(false)
          return
        }
        seen.add(k)
      }
      const cuponesCatalogo: McCuponTienda[] = cuponesValidos.map((c) => ({
        id: c.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())),
        codigo: normalizeCuponCodigo(c.codigo) || c.codigo.trim(),
        tipo: c.tipo,
        valor:
          c.tipo === 'porcentaje'
            ? Math.min(100, Math.max(0, Math.round(c.valor)))
            : Math.max(0, Math.round(c.valor)),
        activo: Boolean(c.activo),
      }))
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { cuponesCatalogo })
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell space-y-6">
      <div>
        <Link
          to="/app/cuenta"
          className="ios-footnote font-medium text-mc-700 underline decoration-neutral-300 underline-offset-4 transition hover:opacity-80"
        >
          ← Volver a Cuenta
        </Link>
        <h1 className="ios-large-title mt-3">Cupones de descuento</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Códigos para el checkout del catálogo. El descuento aplica sobre el subtotal de productos (no sobre el envío).
        </p>
      </div>

      <div className="mc-card space-y-5">
        <div className="space-y-2 rounded-md border border-neutral-200/50 bg-neutral-50/40 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="ios-footnote font-medium text-mc-700">Código</label>
              <input
                className="mc-input mt-1 py-2 text-[15px]"
                placeholder="VERANO20"
                value={nuevoCuponCodigo}
                disabled={busy}
                onChange={(e) => setNuevoCuponCodigo(e.target.value)}
              />
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">Tipo</label>
              <select
                className="mc-input mt-1 py-2.5 text-[15px]"
                value={nuevoCuponTipo}
                disabled={busy}
                onChange={(e) => setNuevoCuponTipo(e.target.value as 'porcentaje' | 'monto_fijo')}
              >
                <option value="porcentaje">Porcentaje</option>
                <option value="monto_fijo">Monto fijo (COP)</option>
              </select>
            </div>
            <div>
              <label className="ios-footnote font-medium text-mc-700">
                {nuevoCuponTipo === 'porcentaje' ? 'Porcentaje' : 'COP'}
              </label>
              <input
                className="mc-input mt-1 py-2 text-[15px]"
                inputMode="decimal"
                placeholder={nuevoCuponTipo === 'porcentaje' ? '10' : '5000'}
                value={nuevoCuponValor}
                disabled={busy}
                onChange={(e) => setNuevoCuponValor(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="mc-btn-secondary w-full py-2.5 text-[14px]"
            disabled={busy}
            onClick={() => {
              const code = normalizeCuponCodigo(nuevoCuponCodigo)
              if (!code) {
                setMsg('Escribí un código para el cupón.')
                return
              }
              if (cupones.some((c) => normalizeCuponCodigo(c.codigo) === code)) {
                setMsg('Ya existe un cupón con ese código.')
                return
              }
              const v = Number(String(nuevoCuponValor).replace(',', '.'))
              if (!Number.isFinite(v) || v <= 0) {
                setMsg('El valor del cupón debe ser mayor a 0.')
                return
              }
              const valor =
                nuevoCuponTipo === 'porcentaje' ? Math.min(100, Math.round(v)) : Math.max(0, Math.round(v))
              const id =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
              setCupones((prev) => [...prev, { id, codigo: code, tipo: nuevoCuponTipo, valor, activo: true }])
              setNuevoCuponCodigo('')
              setNuevoCuponValor('')
              setMsg(null)
            }}
          >
            Agregar cupón
          </button>
        </div>

        {cupones.length > 0 ? (
          <ul className="divide-y divide-neutral-200/50 border border-neutral-200/50">
            {cupones.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[14px] font-medium text-[var(--cat-text)]">{c.codigo}</p>
                  <p className="text-[12px] text-[var(--cat-muted)]">
                    {c.tipo === 'porcentaje' ? `${c.valor}%` : `${c.valor.toLocaleString('es-CO')} COP`} ·{' '}
                    {c.activo ? 'activo' : 'pausado'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[12px] text-mc-700">
                    <input
                      type="checkbox"
                      checked={c.activo}
                      disabled={busy}
                      onChange={(e) =>
                        setCupones((prev) =>
                          prev.map((x) => (x.id === c.id ? { ...x, activo: e.target.checked } : x)),
                        )
                      }
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-mc-500 underline decoration-neutral-300 underline-offset-2"
                    disabled={busy}
                    onClick={() => setCupones((prev) => prev.filter((x) => x.id !== c.id))}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ios-footnote text-[var(--cat-muted)]">Todavía no hay cupones.</p>
        )}

        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar cupones
        </button>
      </div>
    </div>
  )
}
