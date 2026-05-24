import { useEffect, useMemo, useState } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import {
  MC_ENVIO_CHECKOUT_ETIQUETA,
  MC_ENVIO_EMPAQUE_CAMISETA,
  MC_ENVIO_EMPAQUE_DEFAULTS,
  MC_ENVIA_CARRIERS_CO,
  MC_ENVIA_CARRIER_LABELS,
  isMcEnviaCarrierCode,
  type McEnviaCarrierCode,
} from '@/lib/envioCotizacion'
import { formatCop, formatIntegerEsCo } from '@/lib/formatCop'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { DepartamentoCombobox } from '@/public/DepartamentoCombobox'
import type { McEnvioCiudadPrecio } from '@/types/mc'

type EnvioModo = 'automatico' | 'manual'

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

function parseDecimalInput(raw: string, max: number): number {
  const n = Number.parseFloat(raw.replace(',', '.').trim())
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(max, n)
}

function inferModoFromTenant(tenant: {
  envioCotizarAutomatico?: boolean
  envioPorCiudad?: McEnvioCiudadPrecio[]
}): EnvioModo {
  if (tenant.envioCotizarAutomatico === true) return 'automatico'
  if ((tenant.envioPorCiudad?.length ?? 0) > 0) return 'manual'
  if (tenant.envioCotizarAutomatico === false) return 'manual'
  return 'automatico'
}

function matchesCamisetaPreset(peso: number, largo: number, ancho: number, alto: number): boolean {
  const c = MC_ENVIO_EMPAQUE_CAMISETA
  return (
    Math.abs(peso - c.pesoKg) < 0.001 &&
    largo === c.largoCm &&
    ancho === c.anchoCm &&
    alto === c.altoCm
  )
}

function empaqueResumenText(peso: string, largo: string, ancho: string, alto: string): string {
  const p = parseDecimalInput(peso, 30)
  const l = parseDecimalInput(largo, 200)
  const a = parseDecimalInput(ancho, 200)
  const h = parseDecimalInput(alto, 200)
  if (!p || !l || !a || !h) return 'Sin medidas'
  return `${p} kg · ${l} × ${a} × ${h} cm`
}

export function CuentaEnvioPage() {
  const { profile, tenant } = useMcAuth()
  const [modo, setModo] = useState<EnvioModo>('automatico')
  const [gratisDesdeInput, setGratisDesdeInput] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [origenDepartamento, setOrigenDepartamento] = useState('')
  const [origenCiudad, setOrigenCiudad] = useState('')
  const [origenDireccion, setOrigenDireccion] = useState('')
  const [origenTelefono, setOrigenTelefono] = useState('')
  const [empaquePesoInput, setEmpaquePesoInput] = useState('')
  const [empaqueLargoInput, setEmpaqueLargoInput] = useState('')
  const [empaqueAnchoInput, setEmpaqueAnchoInput] = useState('')
  const [empaqueAltoInput, setEmpaqueAltoInput] = useState('')
  const [empaqueExpandido, setEmpaqueExpandido] = useState(true)
  const [empaqueUsaCamiseta, setEmpaqueUsaCamiseta] = useState(false)
  const [transportadoraFavorita, setTransportadoraFavorita] = useState<McEnviaCarrierCode | ''>('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!tenant) return
    setModo(inferModoFromTenant(tenant))
    const g = tenant.envioGratisDesdeCop
    setGratisDesdeInput(g != null && g > 0 ? formatIntegerEsCo(g) : '')
    setOrigenDepartamento(tenant.envioOrigenDepartamento ?? '')
    setOrigenCiudad(tenant.envioOrigenCiudad ?? '')
    setOrigenDireccion(tenant.envioOrigenDireccion ?? '')
    setOrigenTelefono(tenant.envioOrigenTelefono ?? '')
    const fav = tenant.envioTransportadoraFavorita?.trim().toLowerCase() ?? ''
    setTransportadoraFavorita(isMcEnviaCarrierCode(fav) ? fav : '')

    const hasEmpaqueGuardado =
      tenant.envioEmpaquePesoKg != null &&
      tenant.envioEmpaquePesoKg > 0 &&
      tenant.envioEmpaqueLargoCm != null &&
      tenant.envioEmpaqueLargoCm > 0

    let peso: number
    let largo: number
    let ancho: number
    let alto: number

    if (!hasEmpaqueGuardado && inferModoFromTenant(tenant) === 'automatico') {
      peso = MC_ENVIO_EMPAQUE_CAMISETA.pesoKg
      largo = MC_ENVIO_EMPAQUE_CAMISETA.largoCm
      ancho = MC_ENVIO_EMPAQUE_CAMISETA.anchoCm
      alto = MC_ENVIO_EMPAQUE_CAMISETA.altoCm
    } else {
      peso =
        tenant.envioEmpaquePesoKg != null && tenant.envioEmpaquePesoKg > 0
          ? tenant.envioEmpaquePesoKg
          : MC_ENVIO_EMPAQUE_DEFAULTS.pesoKg
      largo =
        tenant.envioEmpaqueLargoCm != null && tenant.envioEmpaqueLargoCm > 0
          ? tenant.envioEmpaqueLargoCm
          : MC_ENVIO_EMPAQUE_DEFAULTS.largoCm
      ancho =
        tenant.envioEmpaqueAnchoCm != null && tenant.envioEmpaqueAnchoCm > 0
          ? tenant.envioEmpaqueAnchoCm
          : MC_ENVIO_EMPAQUE_DEFAULTS.anchoCm
      alto =
        tenant.envioEmpaqueAltoCm != null && tenant.envioEmpaqueAltoCm > 0
          ? tenant.envioEmpaqueAltoCm
          : MC_ENVIO_EMPAQUE_DEFAULTS.altoCm
    }

    setEmpaquePesoInput(String(peso))
    setEmpaqueLargoInput(String(largo))
    setEmpaqueAnchoInput(String(ancho))
    setEmpaqueAltoInput(String(alto))

    const esCamiseta = matchesCamisetaPreset(peso, largo, ancho, alto)
    setEmpaqueUsaCamiseta(esCamiseta)
    setEmpaqueExpandido(!esCamiseta)

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

  const resumen = useMemo(() => {
    const n = rows.filter((r) => r.ciudad.trim()).length
    const g = parseCopInput(gratisDesdeInput)
    const parts: string[] = []
    if (modo === 'automatico') {
      parts.push('Cotización automática')
      if (transportadoraFavorita) {
        parts.push(`Preferida: ${MC_ENVIA_CARRIER_LABELS[transportadoraFavorita]}`)
      }
    } else parts.push(n > 0 ? `${n} ciudad(es) manual` : 'Precios manuales')
    if (g > 0) parts.push(`Gratis desde ${formatCop(g)}`)
    return parts.join(' · ')
  }, [rows, gratisDesdeInput, modo, transportadoraFavorita])

  function aplicarPresetCamiseta() {
    const c = MC_ENVIO_EMPAQUE_CAMISETA
    setEmpaquePesoInput(String(c.pesoKg))
    setEmpaqueLargoInput(String(c.largoCm))
    setEmpaqueAnchoInput(String(c.anchoCm))
    setEmpaqueAltoInput(String(c.altoCm))
    setEmpaqueUsaCamiseta(true)
    setEmpaqueExpandido(false)
  }

  async function guardar() {
    if (!profile?.tenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const gratisDesde = parseCopInput(gratisDesdeInput)
      const esAutomatico = modo === 'automatico'

      if (esAutomatico) {
        if (!origenDepartamento.trim() || !origenCiudad.trim() || !origenDireccion.trim()) {
          setMsg('Completá el origen de despacho: departamento, ciudad y dirección.')
          setBusy(false)
          return
        }
        if (!origenTelefono.replace(/\D/g, '')) {
          setMsg('Ingresá un teléfono de contacto para el origen del envío.')
          setBusy(false)
          return
        }
      }

      const empaquePesoKg = parseDecimalInput(empaquePesoInput, 30)
      const empaqueLargoCm = parseDecimalInput(empaqueLargoInput, 200)
      const empaqueAnchoCm = parseDecimalInput(empaqueAnchoInput, 200)
      const empaqueAltoCm = parseDecimalInput(empaqueAltoInput, 200)
      if (esAutomatico && (!empaquePesoKg || !empaqueLargoCm || !empaqueAnchoCm || !empaqueAltoCm)) {
        setMsg('Revisá peso y medidas del empaque.')
        setBusy(false)
        return
      }

      const seen = new Set<string>()
      const envioPorCiudad: McEnvioCiudadPrecio[] = []

      if (!esAutomatico) {
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
        if (envioPorCiudad.length === 0) {
          setMsg('Agregá al menos una ciudad con su precio de envío.')
          setBusy(false)
          return
        }
      }

      const patch: Record<string, unknown> = {
        envioEstimadoCop: 0,
        envioEstimadoEtiqueta: MC_ENVIO_CHECKOUT_ETIQUETA,
        envioGratisDesdeCop: gratisDesde,
        envioUsarTarifasMicatalogo: false,
        envioCotizarAutomatico: esAutomatico,
        envioPorCiudad: esAutomatico ? [] : envioPorCiudad,
        envioOrigenDepartamento: esAutomatico ? origenDepartamento.trim() : '',
        envioOrigenCiudad: esAutomatico ? origenCiudad.trim() : '',
        envioOrigenDireccion: esAutomatico ? origenDireccion.trim() : '',
        envioOrigenTelefono: esAutomatico ? origenTelefono.trim() : '',
        envioEmpaquePesoKg: esAutomatico ? empaquePesoKg : null,
        envioEmpaqueLargoCm: esAutomatico ? empaqueLargoCm : null,
        envioEmpaqueAnchoCm: esAutomatico ? empaqueAnchoCm : null,
        envioEmpaqueAltoCm: esAutomatico ? empaqueAltoCm : null,
        envioTransportadoraFavorita: esAutomatico ? transportadoraFavorita : '',
      }

      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), patch)
      showSaveSuccess({ title: 'Configuración de envío exitosa' })
    } catch (err) {
      console.error('[CuentaEnvioPage] guardar envío', err)
      const code =
        err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
      if (code === 'permission-denied') {
        setMsg('No se pudo guardar: permiso denegado. Probá de nuevo en unos segundos.')
      } else {
        setMsg('No se pudo guardar. Revisá los datos e intentá otra vez.')
      }
    } finally {
      setBusy(false)
    }
  }

  const fieldInputClass = 'mc-input mt-1 py-2.5'

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3">Configurar envío</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Elegí un método para calcular el envío en el checkout. Solo podés usar uno a la vez.
        </p>
        <p className="mt-2 text-[13px] text-[var(--cat-muted)]">{resumen}</p>
      </div>

      <div className="mc-card space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <button
            type="button"
            disabled={busy}
            onClick={() => setModo('automatico')}
            className={`flex-1 rounded-xl px-4 text-left transition ${
              modo === 'automatico'
                ? 'border-2 border-neutral-900 bg-neutral-900 py-4 text-white shadow-md'
                : 'border border-neutral-200/80 bg-neutral-50/50 py-2.5 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`font-semibold leading-snug ${
                  modo === 'automatico' ? 'text-[16px]' : 'text-[14px] text-[var(--cat-text)]'
                }`}
              >
                Cotizar automáticamente
              </span>
              {modo === 'automatico' ? (
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                  Activo
                </span>
              ) : null}
            </div>
            <span
              className={`mt-1 block leading-snug ${
                modo === 'automatico' ? 'text-[12px] text-white/75' : 'text-[12px] text-[var(--cat-muted)]'
              }`}
            >
              Tarifas reales por transportadora
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setModo('manual')
              if (rows.length === 0) setRows([newRow()])
            }}
            className={`flex-1 rounded-xl px-4 text-left transition ${
              modo === 'manual'
                ? 'border-2 border-neutral-900 bg-neutral-900 py-4 text-white shadow-md'
                : 'border border-neutral-200/80 bg-neutral-50/50 py-2.5 hover:bg-neutral-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`font-semibold leading-snug ${
                  modo === 'manual' ? 'text-[16px]' : 'text-[14px] text-[var(--cat-text)]'
                }`}
              >
                Precios manualmente
              </span>
              {modo === 'manual' ? (
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                  Activo
                </span>
              ) : null}
            </div>
            <span
              className={`mt-1 block leading-snug ${
                modo === 'manual' ? 'text-[12px] text-white/75' : 'text-[12px] text-[var(--cat-muted)]'
              }`}
            >
              Monto fijo por ciudad
            </span>
          </button>
        </div>

        {modo === 'automatico' ? (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Desde dónde despachás</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Departamento</label>
                  <DepartamentoCombobox
                    value={origenDepartamento}
                    disabled={busy}
                    inputClassName={fieldInputClass}
                    placeholder="Buscar departamento…"
                    onChange={(v) => {
                      setOrigenDepartamento(v)
                      setOrigenCiudad('')
                    }}
                  />
                </div>
                <div>
                  <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Ciudad</label>
                  {origenDepartamento.trim() ? (
                    <MunicipioCombobox
                      departamento={origenDepartamento}
                      value={origenCiudad}
                      onChange={setOrigenCiudad}
                      disabled={busy}
                      inputClassName={fieldInputClass}
                      hintEmptyDept="Seleccioná departamento."
                      placeholder="Buscar municipio…"
                    />
                  ) : (
                    <input className="mc-input mt-1 w-full py-2.5 text-[15px]" disabled placeholder="Departamento primero" />
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div>
                  <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Dirección</label>
                  <input
                    className="mc-input mt-1 py-2.5 text-[15px]"
                    placeholder="Calle, número, barrio"
                    value={origenDireccion}
                    disabled={busy}
                    onChange={(e) => setOrigenDireccion(e.target.value)}
                  />
                </div>
                <div className="sm:w-44">
                  <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Teléfono</label>
                  <input
                    className="mc-input mt-1 py-2.5 text-[15px]"
                    inputMode="tel"
                    placeholder="3001234567"
                    value={origenTelefono}
                    disabled={busy}
                    onChange={(e) => setOrigenTelefono(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Transportadora preferida</h2>
                <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                  Opcional. Si elegís una, mostramos su tarifa en checkout cuando esté disponible. Si no, la más
                  barata.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTransportadoraFavorita('')}
                  className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                    transportadoraFavorita === ''
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200/80 bg-neutral-50/50 text-[var(--cat-text)] hover:bg-neutral-50'
                  }`}
                >
                  Más barata
                </button>
                {MC_ENVIA_CARRIERS_CO.map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={busy}
                    onClick={() => setTransportadoraFavorita(code)}
                    className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                      transportadoraFavorita === code
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200/80 bg-neutral-50/50 text-[var(--cat-text)] hover:bg-neutral-50'
                    }`}
                  >
                    {MC_ENVIA_CARRIER_LABELS[code]}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">
                  Agregá las medidas y peso promedio de tus productos
                </h2>
                <p className="mt-1 text-[13px] text-[var(--cat-muted)]">Las usamos para cotizar en checkout.</p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={aplicarPresetCamiseta}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  empaqueUsaCamiseta
                    ? 'border-neutral-900 bg-neutral-900/5 ring-1 ring-neutral-900/20'
                    : 'border-neutral-200/80 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <span className="text-[14px] font-medium text-[var(--cat-text)]">
                  Calcular con el tamaño de un objeto pequeño como una camiseta
                </span>
                <span className="mt-0.5 block text-[12px] text-[var(--cat-muted)]">
                  {MC_ENVIO_EMPAQUE_CAMISETA.pesoKg} kg · {MC_ENVIO_EMPAQUE_CAMISETA.largoCm} ×{' '}
                  {MC_ENVIO_EMPAQUE_CAMISETA.anchoCm} × {MC_ENVIO_EMPAQUE_CAMISETA.altoCm} cm — referencia
                  para productos livianos
                </span>
              </button>

              {!empaqueExpandido ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50/80 px-3 py-2.5">
                  <span className="text-[13px] text-[var(--cat-text)]">
                    {empaqueUsaCamiseta ? 'Objeto pequeño' : 'Personalizado'}:{' '}
                    {empaqueResumenText(empaquePesoInput, empaqueLargoInput, empaqueAnchoInput, empaqueAltoInput)}
                  </span>
                  <button
                    type="button"
                    className="text-[13px] font-medium text-mc-600 underline decoration-neutral-300 underline-offset-2"
                    disabled={busy}
                    onClick={() => setEmpaqueExpandido(true)}
                  >
                    Editar medidas
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-4">
                  {(
                    [
                      ['Peso (kg)', empaquePesoInput, setEmpaquePesoInput],
                      ['Largo (cm)', empaqueLargoInput, setEmpaqueLargoInput],
                      ['Ancho (cm)', empaqueAnchoInput, setEmpaqueAnchoInput],
                      ['Alto (cm)', empaqueAltoInput, setEmpaqueAltoInput],
                    ] as const
                  ).map(([label, value, setter]) => (
                    <div key={label}>
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">{label}</label>
                      <input
                        className="mc-input mt-1 py-2.5 text-[15px]"
                        inputMode="decimal"
                        value={value}
                        disabled={busy}
                        onChange={(e) => {
                          setter(e.target.value)
                          setEmpaqueUsaCamiseta(false)
                        }}
                      />
                    </div>
                  ))}
                  {!empaqueUsaCamiseta && empaquePesoInput ? (
                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        className="text-[13px] font-medium text-[var(--cat-muted)] underline decoration-neutral-300 underline-offset-2"
                        disabled={busy}
                        onClick={() => setEmpaqueExpandido(false)}
                      >
                        Ocultar campos
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Precio por ciudad</h2>
              <button
                type="button"
                className="mc-btn-secondary shrink-0 py-2 text-[13px]"
                disabled={busy}
                onClick={() => setRows((r) => [...r, newRow()])}
              >
                + Ciudad
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[var(--cat-muted)]">
                Agregá al menos una ciudad con su precio.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li
                    key={r.id}
                    className="grid gap-2 rounded-lg bg-neutral-50/60 p-3 sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end"
                  >
                    <div>
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Departamento</label>
                      <DepartamentoCombobox
                        value={r.departamento}
                        disabled={busy}
                        inputClassName={fieldInputClass}
                        placeholder="Departamento…"
                        onChange={(v) => {
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, departamento: v, ciudad: '' } : x)),
                          )
                        }}
                      />
                    </div>
                    <div>
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Ciudad</label>
                      {r.departamento.trim() ? (
                        <MunicipioCombobox
                          departamento={r.departamento}
                          value={r.ciudad}
                          onChange={(v) =>
                            setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ciudad: v } : x)))
                          }
                          disabled={busy}
                          inputClassName="mc-input mt-1 py-2 text-[14px]"
                          hintEmptyDept="Elegí departamento."
                          placeholder="Municipio…"
                        />
                      ) : (
                        <input className="mc-input mt-1 w-full py-2 text-[14px]" disabled placeholder="Dept. primero" />
                      )}
                    </div>
                    <div>
                      <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">COP</label>
                      <input
                        className="mc-input mt-1 py-2 text-[14px]"
                        inputMode="numeric"
                        placeholder="12000"
                        value={r.copInput}
                        disabled={busy}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((x) => (x.id === r.id ? { ...x, copInput: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="pb-2 text-[12px] font-medium text-mc-600 sm:pb-2.5"
                      disabled={busy}
                      onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="space-y-2 pt-2">
          <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Envío gratis desde</h2>
          <div className="max-w-xs">
            <input
              className="mc-input py-2.5 text-[15px]"
              inputMode="numeric"
              placeholder="Ej. 150000 · opcional"
              value={gratisDesdeInput}
              disabled={busy}
              onChange={(e) => setGratisDesdeInput(e.target.value)}
            />
          </div>
          <p className="text-[12px] text-[var(--cat-muted)]">
            Subtotal mínimo en productos para que el envío salga en $0.
          </p>
        </section>

        {msg && <p className="text-[14px] text-red-700">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar envío
        </button>
      </div>
    </div>
  )
}
