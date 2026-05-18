import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import type { McEnvioCiudadPrecio } from '@/types/mc'

type Row = { id: string; ciudad: string; copInput: string }

function newRow(): Row {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now()}`
  return { id, ciudad: '', copInput: '' }
}

function parseCopInput(raw: string): number {
  const d = raw.replace(/\D/g, '')
  if (!d) return 0
  return Math.max(0, Math.min(999_999_999, Math.round(Number(d))))
}

export function CuentaEnvioPage() {
  const { profile, tenant } = useMcAuth()
  const [defaultInput, setDefaultInput] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [gratisDesdeInput, setGratisDesdeInput] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    const ec = tenant.envioEstimadoCop
    setDefaultInput(ec != null && ec > 0 ? formatIntegerEsCo(ec) : '')
    setEtiqueta(tenant.envioEstimadoEtiqueta ?? '')
    const g = tenant.envioGratisDesdeCop
    setGratisDesdeInput(g != null && g > 0 ? formatIntegerEsCo(g) : '')
    const list = tenant.envioPorCiudad ?? []
    setRows(
      list.length
        ? list.map((x, i) => ({
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `x-${i}-${String(x.ciudad)}`,
            ciudad: String(x.ciudad ?? ''),
            copInput: x.cop != null && Number.isFinite(x.cop) && x.cop > 0 ? formatIntegerEsCo(Math.round(x.cop)) : '',
          }))
        : [],
    )
  }, [tenant])

  const resumen = useMemo(() => {
    const n = rows.filter((r) => r.ciudad.trim()).length
    const d = parseCopInput(defaultInput)
    const g = parseCopInput(gratisDesdeInput)
    const parts: string[] = []
    if (d > 0) parts.push(`Por defecto ${formatCop(d)}`)
    if (n > 0) parts.push(`${n} ciudad(es) con tarifa`)
    if (g > 0) parts.push(`Envío gratis desde ${formatCop(g)}`)
    return parts.length ? parts.join(' · ') : 'Podés dejar todo en blanco si no cobrás envío en el checkout.'
  }, [rows, defaultInput, gratisDesdeInput])

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const defaultCop = parseCopInput(defaultInput)
      const gratisDesde = parseCopInput(gratisDesdeInput)

      const seen = new Set<string>()
      const envioPorCiudad: McEnvioCiudadPrecio[] = []
      for (const r of rows) {
        const cj = r.ciudad.trim()
        if (!cj) continue
        const key = normalizeCiudadKey(cj)
        if (seen.has(key)) {
          setMsg('Tenés dos filas con la misma ciudad (o el mismo nombre con distinta escritura). Unificá o borrá una.')
          setBusy(false)
          return
        }
        seen.add(key)
        const cop = parseCopInput(r.copInput)
        envioPorCiudad.push({ ciudad: cj, cop })
      }

      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), {
        envioEstimadoCop: defaultCop,
        envioEstimadoEtiqueta: etiqueta.trim() || '',
        envioGratisDesdeCop: gratisDesde,
        envioPorCiudad,
      })
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
        <h1 className="ios-large-title mt-3">Configurar envío</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Definí tarifas por ciudad (ej. <strong className="font-medium text-[var(--cat-text)]">Cali · $12.000</strong
          >), un{' '}
          <strong className="font-medium text-[var(--cat-text)]">costo por defecto</strong> si la ciudad no está en la
          lista, y opcionalmente{' '}
          <strong className="font-medium text-[var(--cat-text)]">envío gratis</strong> desde un subtotal de compra.
        </p>
      </div>

      <div className="mc-card space-y-5">
        <div className="rounded-lg border border-mc-200/60 bg-mc-50/35 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">Resumen</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cat-text)]">{resumen}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
              Envío por defecto (COP)
            </label>
            <input
              className="mc-input mt-1 py-2.5 text-[15px]"
              inputMode="numeric"
              placeholder="Ej. 12000"
              value={defaultInput}
              disabled={busy}
              onChange={(e) => setDefaultInput(e.target.value)}
            />
            <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
              Si el cliente indica una ciudad que no está en la tabla de abajo, se usa este monto.
            </p>
          </div>
          <div>
            <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Etiqueta en checkout</label>
            <input
              className="mc-input mt-1 py-2.5 text-[15px]"
              placeholder="Ej. Envío"
              value={etiqueta}
              disabled={busy}
              onChange={(e) => setEtiqueta(e.target.value)}
            />
            <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">Cómo se muestra la línea de envío en el pedido.</p>
          </div>
        </div>

        <div className="max-w-md">
          <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">
            Envío gratis desde (subtotal en COP)
          </label>
          <input
            className="mc-input mt-1 py-2.5 text-[15px]"
            inputMode="numeric"
            placeholder="Ej. 150000 · dejar vacío para no ofrecer"
            value={gratisDesdeInput}
            disabled={busy}
            onChange={(e) => setGratisDesdeInput(e.target.value)}
          />
          <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
            Si el subtotal de productos (antes de cupón y envío) alcanza este monto, el envío sale en $0.
          </p>
        </div>

        <div className="border-t border-neutral-200/50 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tarifas por ciudad</p>
              <p className="ios-subhead mt-1 text-[var(--cat-muted)]">
                Una fila por ciudad. Comparación flexible (tildes y mayúsculas). Monto en pesos colombianos.
              </p>
            </div>
            <button
              type="button"
              className="mc-btn-secondary shrink-0 py-2.5 text-[14px]"
              disabled={busy}
              onClick={() => setRows((r) => [...r, newRow()])}
            >
              Agregar ciudad
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="ios-footnote mt-3 rounded-md border border-dashed border-neutral-200/70 bg-neutral-50/50 px-4 py-6 text-center text-[var(--cat-muted)]">
              Sin tarifas por ciudad. Solo se aplicará el envío por defecto.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-neutral-200/55 bg-neutral-50/30 p-3 sm:flex-row sm:items-end"
                >
                  <div className="min-w-0 flex-1">
                    <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Ciudad</label>
                    <input
                      className="mc-input mt-1 py-2.5 text-[15px]"
                      placeholder="Cali"
                      value={r.ciudad}
                      disabled={busy}
                      onChange={(e) =>
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ciudad: e.target.value } : x)))
                      }
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Costo (COP)</label>
                    <input
                      className="mc-input mt-1 py-2.5 text-[15px]"
                      inputMode="numeric"
                      placeholder="12000"
                      value={r.copInput}
                      disabled={busy}
                      onChange={(e) =>
                        setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, copInput: e.target.value } : x)))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="text-[13px] font-medium text-mc-600 underline decoration-neutral-300 underline-offset-2 sm:mb-2.5 sm:shrink-0"
                    disabled={busy}
                    onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar envío
        </button>
      </div>
    </div>
  )
}
