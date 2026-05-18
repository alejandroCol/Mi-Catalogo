import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { COLOMBIA_DEPARTAMENTOS, formatoDepartamentoEtiqueta } from '@/lib/colombiaGeo'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import type { McEnvioCiudadPrecio, McPlatformSettings } from '@/types/mc'

type Row = { id: string; departamento: string; ciudad: string; copInput: string }

function newRow(): Row {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now()}`
  return { id, departamento: '', ciudad: '', copInput: '' }
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
  const [usarTarifasMc, setUsarTarifasMc] = useState(false)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) return
    void (async () => {
      try {
        const snap = await getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc))
        setPlatformSettings(snap.exists() ? (snap.data() as McPlatformSettings) : {})
      } catch {
        setPlatformSettings(null)
      }
    })()
  }, [])

  useEffect(() => {
    if (!tenant) return
    const ec = tenant.envioEstimadoCop
    setDefaultInput(ec != null && ec > 0 ? formatIntegerEsCo(ec) : '')
    setEtiqueta(tenant.envioEstimadoEtiqueta ?? '')
    const g = tenant.envioGratisDesdeCop
    setGratisDesdeInput(g != null && g > 0 ? formatIntegerEsCo(g) : '')
    setUsarTarifasMc(tenant.envioUsarTarifasMicatalogo === true)
    const list = tenant.envioPorCiudad ?? []
    setRows(
      list.length
        ? list.map((x, i) => ({
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `x-${i}-${String(x.ciudad)}`,
            departamento: String(x.departamento ?? ''),
            ciudad: String(x.ciudad ?? ''),
            copInput:
              x.cop != null && Number.isFinite(x.cop) && x.cop > 0 ? formatIntegerEsCo(Math.round(x.cop)) : '',
          }))
        : [],
    )
  }, [tenant])

  const tarifasPlataformaActivas = useMemo(() => {
    const p = platformSettings
    if (!p) return false
    return (
      ((p.envioMicatalogoPorCiudad?.length ?? 0) > 0 ||
        (typeof p.envioMicatalogoEstimadoCop === 'number' &&
          Number.isFinite(p.envioMicatalogoEstimadoCop) &&
          p.envioMicatalogoEstimadoCop > 0))
    )
  }, [platformSettings])

  const textoTarifasMc = useMemo(() => {
    if (!tarifasPlataformaActivas || !platformSettings) return null
    const n = platformSettings.envioMicatalogoPorCiudad?.length ?? 0
    const d =
      typeof platformSettings.envioMicatalogoEstimadoCop === 'number'
        ? Math.max(0, Math.round(platformSettings.envioMicatalogoEstimadoCop))
        : 0
    const bits: string[] = []
    if (d > 0) bits.push(`costo por defecto ${formatCop(d)}`)
    if (n > 0) bits.push(`${n} ciudad(es) en la tabla central`)
    return bits.length ? bits.join(' · ') : null
  }, [platformSettings, tarifasPlataformaActivas])

  const resumen = useMemo(() => {
    const n = rows.filter((r) => r.ciudad.trim()).length
    const d = parseCopInput(defaultInput)
    const g = parseCopInput(gratisDesdeInput)
    const parts: string[] = []
    if (usarTarifasMc && textoTarifasMc) {
      parts.push(`Checkout usa tarifas Mi Catálogo (${textoTarifasMc})`)
    } else {
      if (d > 0) parts.push(`Por defecto ${formatCop(d)}`)
      if (n > 0) parts.push(`${n} ciudad(es) con tarifa propia`)
    }
    if (g > 0) parts.push(`Envío gratis desde ${formatCop(g)}`)
    return parts.length ? parts.join(' · ') : 'Podés dejar todo en blanco si no cobrás envío en el checkout.'
  }, [rows, defaultInput, gratisDesdeInput, usarTarifasMc, textoTarifasMc])

  const bloquearTarifasPropias = usarTarifasMc && tarifasPlataformaActivas

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const defaultCop = parseCopInput(defaultInput)
      const gratisDesde = parseCopInput(gratisDesdeInput)

      const seen = new Set<string>()
      const envioPorCiudad: McEnvioCiudadPrecio[] = []
      if (!bloquearTarifasPropias) {
        for (const r of rows) {
          const dj = r.departamento.trim()
          const cj = r.ciudad.trim()
          if (!cj) continue
          const dk = dj ? normalizeCiudadKey(dj) : '|'
          const ck = normalizeCiudadKey(cj)
          const seenKey = `${dk}\0${ck}`
          if (seen.has(seenKey)) {
            setMsg(
              dj
                ? 'Tenés dos filas con la misma ciudad en el mismo departamento. Unificá o borrá una.'
                : 'Tenés dos filas con la misma ciudad sin departamento. Unificá o borrá una.',
            )
            setBusy(false)
            return
          }
          seen.add(seenKey)
          const cop = parseCopInput(r.copInput)
          envioPorCiudad.push({
            ciudad: cj,
            cop,
            ...(dj ? { departamento: dj } : {}),
          })
        }
      }

      const patch: Record<string, unknown> = {
        envioEstimadoCop: defaultCop,
        envioEstimadoEtiqueta: etiqueta.trim() || '',
        envioGratisDesdeCop: gratisDesde,
        envioUsarTarifasMicatalogo: usarTarifasMc,
      }
      if (!bloquearTarifasPropias) {
        patch.envioPorCiudad = envioPorCiudad
      }

      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), patch)
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  const cbInputClass = 'mc-input mt-1 py-2.5 text-[15px]'

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
          Por cada ubicación definí{' '}
          <strong className="font-medium text-[var(--cat-text)]">departamento, ciudad y valor en COP</strong>. Podés usar
          un <strong className="font-medium text-[var(--cat-text)]">costo por defecto</strong> para ciudades que no
          cargues con tarifa específica, y opcionalmente{' '}
          <strong className="font-medium text-[var(--cat-text)]">envío gratis</strong> desde un subtotal de compra.
        </p>
      </div>

      <div className="mc-card space-y-5">
        <div className="rounded-lg border border-mc-200/60 bg-mc-50/35 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">Resumen</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cat-text)]">{resumen}</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-neutral-200/70 bg-neutral-50/40 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={usarTarifasMc}
            disabled={busy}
            onChange={(e) => setUsarTarifasMc(e.target.checked)}
          />
          <span className="text-[14px] leading-relaxed text-[var(--cat-text)]">
            <span className="font-medium">Usar tarifas sugeridas de Mi Catálogo</span>
            <span className="mt-1 block text-[13px] text-[var(--cat-muted)]">
              El checkout tomará el costo por defecto y la tabla por ciudad que cargó el equipo Mi Catálogo (súper admin).
              Seguís pudiendo definir envío gratis desde subtotal y la etiqueta visible en el checkout.
            </span>
          </span>
        </label>

        {usarTarifasMc && !tarifasPlataformaActivas && (
          <p className="rounded-md border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-[13px] leading-relaxed text-amber-950">
            Todavía no hay tarifas publicadas en la plataforma: el checkout usará tu envío por defecto y tabla propia
            como respaldo hasta que Mi Catálogo cargue datos.
          </p>
        )}

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
              disabled={busy || bloquearTarifasPropias}
              onChange={(e) => setDefaultInput(e.target.value)}
            />
            <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
              {bloquearTarifasPropias
                ? 'Con tarifas Mi Catálogo activas, el costo por defecto lo define la plataforma (podés pedir que lo ajusten desde soporte).'
                : 'Si el cliente indica una ciudad que no está en la tabla de abajo, se usa este monto.'}
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

        <div className={`border-t border-neutral-200/50 pt-5 ${bloquearTarifasPropias ? 'opacity-40' : ''}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Tarifas por ciudad (tu tienda)</p>
              <p className="ios-subhead mt-1 text-[var(--cat-muted)]">
                En cada fila primero seleccioná el departamento y después el municipio; el autocomplete solo lista
                ciudades de ese departamento. Si tenés filas antiguas sin departamento, podés completar el dato o
                dejarlas como estaban. El checkout compara con la misma lógica (tildes y mayúsculas flexibles).
              </p>
            </div>
            <button
              type="button"
              className="mc-btn-secondary shrink-0 py-2.5 text-[14px]"
              disabled={busy || bloquearTarifasPropias}
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
            <ul className="mt-3 space-y-3">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 rounded-lg border border-neutral-200/55 bg-neutral-50/30 p-3 lg:flex-row lg:items-end"
                >
                  <div className="min-w-0 flex-1 sm:grid sm:grid-cols-2 sm:gap-3">
                    <div className="min-w-0">
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Departamento</label>
                      <select
                        className="mc-input mt-1 w-full py-2.5 text-[15px]"
                        value={r.departamento}
                        disabled={busy || bloquearTarifasPropias}
                        onChange={(e) => {
                          const next = e.target.value
                          setRows((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, departamento: next, ciudad: '' } : x,
                            ),
                          )
                        }}
                      >
                        <option value="">Seleccionar…</option>
                        {COLOMBIA_DEPARTAMENTOS.map((d) => (
                          <option key={d} value={d}>
                            {formatoDepartamentoEtiqueta(d)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Ciudad / municipio</label>
                      {r.departamento.trim() ? (
                        <MunicipioCombobox
                          departamento={r.departamento}
                          value={r.ciudad}
                          onChange={(v) =>
                            setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ciudad: v } : x)))
                          }
                          disabled={busy || bloquearTarifasPropias}
                          inputClassName={cbInputClass}
                          hintEmptyDept="Seleccioná un departamento arriba."
                          placeholder="Buscar municipio…"
                        />
                      ) : (
                        <input
                          className="mc-input mt-1 w-full py-2.5 text-[15px]"
                          placeholder='Ej. "Cali" (completá departamento para usar la lista oficial)'
                          value={r.ciudad}
                          disabled={busy || bloquearTarifasPropias}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, ciudad: e.target.value } : x)),
                            )
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="w-full shrink-0 lg:w-40">
                    <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Costo (COP)</label>
                    <input
                      className="mc-input mt-1 py-2.5 text-[15px]"
                      inputMode="numeric"
                      placeholder="12000"
                      value={r.copInput}
                      disabled={busy || bloquearTarifasPropias}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, copInput: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className="text-[13px] font-medium text-mc-600 underline decoration-neutral-300 underline-offset-2 lg:mb-2.5 lg:shrink-0"
                    disabled={busy || bloquearTarifasPropias}
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
