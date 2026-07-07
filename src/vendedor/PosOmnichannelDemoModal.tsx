import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { callMcSeedReportDemoData } from '@/lib/mcSeedReportDemoApi'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'
import { demoPosAdminPath } from '@/vendedor/demo-pos/demoPosPaths'

type Props = {
  open: boolean
  onClose: () => void
  focus?: 'admin' | 'vendedora'
}

export function PosOmnichannelDemoModal({ open, onClose, focus = 'admin' }: Props) {
  const nav = useNavigate()
  const { startStoreImpersonation } = useMcAuth()
  const { stores, loading } = useDemoStores(true)
  const [selectedId, setSelectedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedOk, setSeedOk] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  const selected = stores.find((s) => s.id === selectedId)

  async function entrarComo(modo: 'admin' | 'vendedora') {
    if (!selected?.tenantId) {
      setErr('Esta tienda demo no tiene tenant vinculado. Pedile al súper admin que la configure.')
      return
    }
    setBusy(true)
    setErr(null)
    const res = await startStoreImpersonation(selected.tenantId)
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    onClose()
    nav(modo === 'admin' ? '/pos/admin' : '/pos/ventas')
  }

  async function cargarDataReportes() {
    if (!selected?.tenantId) {
      setErr('Esta tienda demo no tiene tenant vinculado.')
      return
    }
    setSeeding(true)
    setErr(null)
    setSeedOk(null)
    const res = await callMcSeedReportDemoData(selected.tenantId)
    setSeeding(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    const d = res.data
    setSeedOk(
      `Listo: ${d.ordenesCatalogo} órdenes catálogo, ${d.ventasPos} ventas POS y ${d.analyticsDaily} días de visitas (${d.dias} días). Productos usados: ${d.productosCatalogoUsados} catálogo, ${d.productosPosUsados} POS.`,
    )
  }

  async function verReportesTienda() {
    if (!selected?.tenantId) {
      setErr('Esta tienda demo no tiene tenant vinculado.')
      return
    }
    setBusy(true)
    setErr(null)
    const res = await startStoreImpersonation(selected.tenantId)
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    onClose()
    nav('/app/reportes')
  }

  function abrirCatalogo() {
    if (!selected?.slug) return
    window.open(buildStorePublicUrl(selected.slug), '_blank', 'noopener,noreferrer')
  }

  function abrirDemoPosMock() {
    if (!selected) return
    onClose()
    nav(demoPosAdminPath(selected.id))
  }

  return (
    <div className="mc-vendedor-modal__backdrop" onClick={onClose}>
      <div
        className="mc-vendedor-modal mc-vendedor-modal--wide"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mc-vendedor-modal__title">Demo POS y reportes</h2>
        <p className="mc-vendedor-modal__sub">
          Elegí una tienda demo. Podés cargar ventas simuladas basadas en sus productos reales (sin tocar
          inventario, estilos ni banners) y entrar al POS o al admin para mostrar reportes con gráficas.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-mc-500">Cargando tiendas demo…</p>
        ) : stores.length === 0 ? (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-mc-500">
            <p>Aún no hay tiendas demo configuradas.</p>
            <p>
              El súper admin debe crearlas en <strong>Vendedores</strong> y vincular el tenant de una tienda con
              productos cargados.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">Tienda demo</label>
              <select
                className="mc-input mt-2"
                value={selectedId}
                disabled={busy || seeding}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  setErr(null)
                  setSeedOk(null)
                }}
              >
                <option value="">Seleccionar…</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName}
                  </option>
                ))}
              </select>
              {selected?.description ? (
                <p className="mt-2 text-sm text-mc-600">{selected.description}</p>
              ) : null}
              {selected && !selected.tenantId ? (
                <p className="mt-2 text-sm text-amber-800">Sin tenant vinculado — no se puede usar POS real ni cargar data.</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 p-4 text-sm leading-relaxed text-emerald-950">
              <strong>Data para reportes:</strong> genera ~90 días de órdenes en tienda virtual, ventas POS y visitas
              usando los productos que ya tiene la tienda. Reemplaza solo data demo anterior (marcada internamente).
            </div>

            <button
              type="button"
              className="mc-landing-btn-primary w-full text-sm"
              disabled={!selected?.tenantId || busy || seeding}
              onClick={() => void cargarDataReportes()}
            >
              {seeding ? 'Generando data demo…' : 'Cargar data demo para reportes'}
            </button>

            {seedOk ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {seedOk}
              </p>
            ) : null}

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
              <strong>Tip presentación:</strong> después de cargar data, entrá como admin POS o abrí el catálogo en otra
              ventana. Los reportes de tienda virtual están en Ventas → Reportes; en POS en Reportes.
            </div>

            {err ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {err}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={`flex-1 text-sm ${focus === 'admin' ? 'mc-landing-btn-primary' : 'mc-landing-btn-secondary'}`}
                disabled={!selected?.tenantId || busy || seeding}
                onClick={() => void entrarComo('admin')}
              >
                {busy ? 'Entrando…' : 'Entrar como admin POS (real)'}
              </button>
              <button
                type="button"
                className={`flex-1 text-sm ${focus === 'vendedora' ? 'mc-landing-btn-primary' : 'mc-landing-btn-secondary'}`}
                disabled={!selected?.tenantId || busy || seeding}
                onClick={() => void entrarComo('vendedora')}
              >
                {busy ? 'Entrando…' : 'Entrar como cajera (real)'}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className="mc-landing-btn-secondary w-full text-sm"
                disabled={!selected?.tenantId || busy || seeding}
                onClick={() => void verReportesTienda()}
              >
                Reportes tienda virtual
              </button>
              <button
                type="button"
                className="mc-landing-btn-secondary w-full text-sm"
                disabled={!selected?.slug || busy || seeding}
                onClick={abrirCatalogo}
              >
                Abrir catálogo público
              </button>
            </div>

            <button
              type="button"
              className="mc-landing-btn-ghost w-full text-sm"
              disabled={!selected || busy || seeding}
              onClick={abrirDemoPosMock}
            >
              Demo POS mock (sin conexión)
            </button>
          </div>
        )}

        <button
          type="button"
          className="mc-landing-btn-secondary mt-6 w-full text-sm"
          disabled={busy || seeding}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
