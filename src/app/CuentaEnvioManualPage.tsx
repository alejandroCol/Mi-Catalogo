import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { EnvioGratisDesdeSection } from '@/app/envio/EnvioGratisDesdeSection'
import {
  ENVIO_FIELD_INPUT_CLASS,
  envioCiudadRowsFromTenant,
  newEnvioCiudadRow,
  parseCopInput,
  type EnvioCiudadRow,
} from '@/app/envio/envioFormShared'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { normalizeCiudadKey } from '@/lib/checkoutShipping'
import { MC_ENVIO_CHECKOUT_ETIQUETA } from '@/lib/envioCotizacion'
import { formatIntegerEsCo } from '@/lib/formatCop'
import type { McEnvioCiudadPrecio } from '@/types/mc'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { DepartamentoCombobox } from '@/public/DepartamentoCombobox'

export function CuentaEnvioManualPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const navigate = useNavigate()
  const { returnTo, navState, fromOutsideConfig } = useConfigSubpageNav()
  const [gratisDesdeInput, setGratisDesdeInput] = useState('')
  const [rows, setRows] = useState<EnvioCiudadRow[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!tenant) return
    const g = tenant.envioGratisDesdeCop
    setGratisDesdeInput(g != null && g > 0 ? formatIntegerEsCo(g) : '')
    const list = envioCiudadRowsFromTenant(tenant.envioPorCiudad)
    setRows(list.length ? list : [newEnvioCiudadRow()])
  }, [tenant])

  async function guardar() {
    if (!effectiveTenantId) return
    setBusy(true)
    setMsg(null)
    try {
      const gratisDesde = parseCopInput(gratisDesdeInput)
      const seen = new Set<string>()
      const envioPorCiudad: McEnvioCiudadPrecio[] = []

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

      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        envioEstimadoCop: 0,
        envioEstimadoEtiqueta: MC_ENVIO_CHECKOUT_ETIQUETA,
        envioGratisDesdeCop: gratisDesde,
        envioUsarTarifasMicatalogo: false,
        envioCotizarAutomatico: false,
        envioPorCiudad: envioPorCiudad,
        envioOrigenDepartamento: '',
        envioOrigenCiudad: '',
        envioOrigenDireccion: '',
        envioOrigenTelefono: '',
        envioEmpaquePesoKg: null,
        envioEmpaqueLargoCm: null,
        envioEmpaqueAnchoCm: null,
        envioEmpaqueAltoCm: null,
        envioTransportadoraFavorita: '',
      })
      showSaveSuccess({
        title: 'Configuración de envío exitosa',
        onAfterClose: () => navigate(returnTo, fromOutsideConfig ? { state: navState } : undefined),
      })
    } catch (err) {
      console.error('[CuentaEnvioManualPage] guardar envío', err)
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
        <h1 className="ios-large-title mt-3">Precios manualmente</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Definí un monto fijo de envío por ciudad para tu catálogo.
        </p>
      </div>

      <div className="mc-card space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[var(--cat-text)]">Precio por ciudad</h2>
            <button
              type="button"
              className="mc-btn-secondary shrink-0 py-2 text-[13px]"
              disabled={busy}
              onClick={() => setRows((r) => [...r, newEnvioCiudadRow()])}
            >
              + Ciudad
            </button>
          </div>

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
                    inputClassName={ENVIO_FIELD_INPUT_CLASS}
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
                  disabled={busy || rows.length <= 1}
                  onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
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
