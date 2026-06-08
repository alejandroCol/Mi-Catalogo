import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { EnvioGratisDesdeSection } from '@/app/envio/EnvioGratisDesdeSection'
import {
  ENVIO_FIELD_INPUT_CLASS,
  parseCopInput,
  parseDecimalInput,
} from '@/app/envio/envioFormShared'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { doc, updateDoc } from 'firebase/firestore'
import { formatIntegerEsCo } from '@/lib/formatCop'
import {
  MC_ENVIO_CHECKOUT_ETIQUETA,
  MC_ENVIO_EMPAQUE_CAMISETA,
  MC_ENVIO_EMPAQUE_DEFAULTS,
  MC_ENVIA_CARRIERS_CO,
  MC_ENVIA_CARRIER_LABELS,
  isMcEnviaCarrierCode,
  type McEnviaCarrierCode,
} from '@/lib/envioCotizacion'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { DepartamentoCombobox } from '@/public/DepartamentoCombobox'

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

export function CuentaEnvioAutomaticoPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const navigate = useNavigate()
  const { returnTo, navState } = useConfigSubpageNav()
  const [gratisDesdeInput, setGratisDesdeInput] = useState('')
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

    if (!hasEmpaqueGuardado) {
      peso = MC_ENVIO_EMPAQUE_CAMISETA.pesoKg
      largo = MC_ENVIO_EMPAQUE_CAMISETA.largoCm
      ancho = MC_ENVIO_EMPAQUE_CAMISETA.anchoCm
      alto = MC_ENVIO_EMPAQUE_CAMISETA.altoCm
    } else {
      peso = tenant.envioEmpaquePesoKg!
      largo = tenant.envioEmpaqueLargoCm ?? MC_ENVIO_EMPAQUE_DEFAULTS.largoCm
      ancho = tenant.envioEmpaqueAnchoCm ?? MC_ENVIO_EMPAQUE_DEFAULTS.anchoCm
      alto = tenant.envioEmpaqueAltoCm ?? MC_ENVIO_EMPAQUE_DEFAULTS.altoCm
    }

    setEmpaquePesoInput(String(peso))
    setEmpaqueLargoInput(String(largo))
    setEmpaqueAnchoInput(String(ancho))
    setEmpaqueAltoInput(String(alto))

    const esCamiseta = matchesCamisetaPreset(peso, largo, ancho, alto)
    setEmpaqueUsaCamiseta(esCamiseta)
    setEmpaqueExpandido(!esCamiseta)
  }, [tenant])

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
    if (!effectiveTenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const gratisDesde = parseCopInput(gratisDesdeInput)

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

      const empaquePesoKg = parseDecimalInput(empaquePesoInput, 30)
      const empaqueLargoCm = parseDecimalInput(empaqueLargoInput, 200)
      const empaqueAnchoCm = parseDecimalInput(empaqueAnchoInput, 200)
      const empaqueAltoCm = parseDecimalInput(empaqueAltoInput, 200)
      if (!empaquePesoKg || !empaqueLargoCm || !empaqueAnchoCm || !empaqueAltoCm) {
        setMsg('Revisá peso y medidas del empaque.')
        setBusy(false)
        return
      }

      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        envioEstimadoCop: 0,
        envioEstimadoEtiqueta: MC_ENVIO_CHECKOUT_ETIQUETA,
        envioGratisDesdeCop: gratisDesde,
        envioUsarTarifasMicatalogo: false,
        envioCotizarAutomatico: true,
        envioPorCiudad: [],
        envioOrigenDepartamento: origenDepartamento.trim(),
        envioOrigenCiudad: origenCiudad.trim(),
        envioOrigenDireccion: origenDireccion.trim(),
        envioOrigenTelefono: origenTelefono.trim(),
        envioEmpaquePesoKg: empaquePesoKg,
        envioEmpaqueLargoCm: empaqueLargoCm,
        envioEmpaqueAnchoCm: empaqueAnchoCm,
        envioEmpaqueAltoCm: empaqueAltoCm,
        envioTransportadoraFavorita: transportadoraFavorita,
      })
      showSaveSuccess({
        title: 'Configuración de envío exitosa',
        onAfterClose: () => navigate(returnTo),
      })
    } catch (err) {
      console.error('[CuentaEnvioAutomaticoPage] guardar envío', err)
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

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to="/app/cuenta/envio" label="← Configurar envío" state={navState} />
        <h1 className="ios-large-title mt-3">Cotizar automáticamente</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Tarifas reales por transportadora según origen, destino y empaque de tus productos.
        </p>
      </div>

      <div className="mc-card space-y-6">
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Desde dónde despachás</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Departamento</label>
              <DepartamentoCombobox
                value={origenDepartamento}
                disabled={busy}
                inputClassName={ENVIO_FIELD_INPUT_CLASS}
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
                  inputClassName={ENVIO_FIELD_INPUT_CLASS}
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
              Opcional. Si elegís una, mostramos su tarifa en checkout cuando esté disponible. Si no, la más barata.
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
              {MC_ENVIO_EMPAQUE_CAMISETA.anchoCm} × {MC_ENVIO_EMPAQUE_CAMISETA.altoCm} cm — referencia para productos
              livianos
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

        <EnvioGratisDesdeSection value={gratisDesdeInput} disabled={busy} onChange={setGratisDesdeInput} />

        {msg && <p className="text-[14px] text-red-700">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar envío
        </button>
      </div>
    </div>
  )
}
