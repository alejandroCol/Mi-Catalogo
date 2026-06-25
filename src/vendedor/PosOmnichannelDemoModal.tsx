import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'

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

  function abrirCatalogo() {
    if (!selected?.slug) return
    window.open(buildStorePublicUrl(selected.slug), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mc-vendedor-modal__backdrop" onClick={onClose}>
      <div
        className="mc-vendedor-modal mc-vendedor-modal--wide"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mc-vendedor-modal__title">POS tienda real</h2>
        <p className="mc-vendedor-modal__sub">
          Elegí una tienda demo y entrá al POS con datos reales (cargados desde súper admin). Mostrá admin con
          reportes o la vista de cajera.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-mc-500">Cargando tiendas demo…</p>
        ) : stores.length === 0 ? (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-mc-500">
            <p>Aún no hay tiendas demo configuradas.</p>
            <p>
              El súper admin debe crearlas en <strong>Vendedores</strong>, vincular el tenant y usar{' '}
              <strong>Cargar data POS demo</strong> en el detalle de la tienda.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">Tienda demo</label>
              <select
                className="mc-input mt-2"
                value={selectedId}
                disabled={busy}
                onChange={(e) => {
                  setSelectedId(e.target.value)
                  setErr(null)
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
                <p className="mt-2 text-sm text-amber-800">Sin tenant vinculado — no se puede entrar al POS real.</p>
              ) : null}
            </div>

            <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 p-4 text-sm leading-relaxed text-amber-950">
              <strong>Tip presentación:</strong> abrí el catálogo en otra ventana. Si la tienda tiene data POS demo,
              al cobrar se actualiza el stock en vivo.
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
                disabled={!selected?.tenantId || busy}
                onClick={() => void entrarComo('admin')}
              >
                {busy ? 'Entrando…' : 'Entrar como admin POS'}
              </button>
              <button
                type="button"
                className={`flex-1 text-sm ${focus === 'vendedora' ? 'mc-landing-btn-primary' : 'mc-landing-btn-secondary'}`}
                disabled={!selected?.tenantId || busy}
                onClick={() => void entrarComo('vendedora')}
              >
                {busy ? 'Entrando…' : 'Entrar como vendedora'}
              </button>
            </div>

            <button
              type="button"
              className="mc-landing-btn-ghost w-full text-sm"
              disabled={!selected?.slug || busy}
              onClick={abrirCatalogo}
            >
              Abrir catálogo público (ventana 2)
            </button>
          </div>
        )}

        <button type="button" className="mc-landing-btn-secondary mt-6 w-full text-sm" disabled={busy} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
