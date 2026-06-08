import { useState } from 'react'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'
import type { McDemoStore } from '@/types/mc'

type Props = {
  open: boolean
  onClose: () => void
  onViewAdmin: (store: McDemoStore) => void
  focus?: 'public' | 'admin'
}

export function VerDemoModal({ open, onClose, onViewAdmin, focus = 'public' }: Props) {
  const { stores, loading } = useDemoStores(true)
  const [selectedId, setSelectedId] = useState('')

  if (!open) return null

  const selected = stores.find((s) => s.id === selectedId)

  return (
    <div className="mc-vendedor-modal__backdrop">
      <div className="mc-vendedor-modal" role="dialog">
        <h2 className="mc-vendedor-modal__title">Ver demo</h2>
        <p className="mc-vendedor-modal__sub">Elegí una tienda para mostrar a la marca.</p>

        {loading ? (
          <p className="mt-6 text-sm text-mc-500">Cargando tiendas demo…</p>
        ) : stores.length === 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-mc-500">
            Aún no hay tiendas demo. El súper admin debe crearlas desde el panel Vendedores.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">Tienda demo</label>
              <select
                className="mc-input mt-2"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
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
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className={`flex-1 text-sm ${focus === 'public' ? 'mc-landing-btn-primary' : 'mc-landing-btn-secondary'}`}
                disabled={!selected?.slug}
                onClick={() => {
                  if (!selected?.slug) return
                  window.open(buildStorePublicUrl(selected.slug), '_blank', 'noopener,noreferrer')
                }}
              >
                Ver tienda (cliente)
              </button>
              <button
                type="button"
                className={`flex-1 text-sm ${focus === 'admin' ? 'mc-landing-btn-primary' : 'mc-landing-btn-secondary'}`}
                disabled={!selected}
                onClick={() => selected && onViewAdmin(selected)}
              >
                Ver como admin
              </button>
            </div>
          </div>
        )}

        <button type="button" className="mc-landing-btn-secondary mt-6 w-full text-sm" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
