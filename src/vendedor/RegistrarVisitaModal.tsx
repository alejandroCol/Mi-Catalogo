import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { useRegisteredStores } from '@/vendedor/hooks/useRegisteredStores'
import type { McSalesVisitOutcome } from '@/types/mc'

type Props = {
  open: boolean
  onClose: () => void
  salesRepUid: string
  salesRepName: string
}

const OUTCOMES: { value: McSalesVisitOutcome; label: string }[] = [
  { value: 'venta_exitosa', label: 'Venta exitosa' },
  { value: 'pendiente', label: 'Pendiente — nueva visita' },
  { value: 'rechazo', label: 'Rechazo' },
]

function localDateKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function RegistrarVisitaModal({ open, onClose, salesRepUid, salesRepName }: Props) {
  const [storeName, setStoreName] = useState('')
  const [storeDetail, setStoreDetail] = useState('')
  const [associateSearch, setAssociateSearch] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [outcome, setOutcome] = useState<McSalesVisitOutcome>('pendiente')
  const [rejectionReason, setRejectionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const { stores, loading: storesLoading, error: storesError } = useRegisteredStores(open)

  useEffect(() => {
    if (!open) {
      setStoreName('')
      setStoreDetail('')
      setAssociateSearch('')
      setSelectedTenantId('')
      setOutcome('pendiente')
      setRejectionReason('')
      setErr(null)
    }
  }, [open])

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedTenantId) ?? null,
    [stores, selectedTenantId],
  )

  const associateResults = useMemo(() => {
    const q = associateSearch.trim().toLowerCase()
    if (!q || selectedTenantId) return []
    return stores
      .filter((s) => s.nombreTienda.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q))
      .slice(0, 12)
  }, [stores, associateSearch, selectedTenantId])

  if (!open) return null

  function associateStore(id: string) {
    const store = stores.find((s) => s.id === id)
    if (!store) return
    setSelectedTenantId(store.id)
    setAssociateSearch('')
    if (!storeName.trim()) setStoreName(store.nombreTienda)
    setErr(null)
  }

  function clearAssociation() {
    setSelectedTenantId('')
    setAssociateSearch('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    const name = storeName.trim()
    const detail = storeDetail.trim()

    if (!name) {
      setErr('Escribí el nombre de la tienda.')
      return
    }
    if (outcome === 'rechazo' && !rejectionReason.trim()) {
      setErr('Indicá el motivo del rechazo.')
      return
    }

    setBusy(true)
    try {
      await addDoc(collection(getDb(), MC.salesVisits), {
        salesRepUid,
        salesRepName,
        storeName: name,
        ...(detail ? { storeDetail: detail } : {}),
        ...(selectedStore
          ? {
              tenantId: selectedStore.id,
              tenantSlug: selectedStore.slug,
            }
          : {}),
        outcome,
        ...(outcome === 'rechazo' ? { rejectionReason: rejectionReason.trim() } : {}),
        dateKey: localDateKey(),
        createdAt: Date.now(),
      })
      onClose()
    } catch {
      setErr('No se pudo guardar la visita. Revisá tu conexión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-vendedor-modal__backdrop">
      <div className="mc-vendedor-modal max-w-lg" role="dialog" aria-labelledby="registrar-visita-title">
        <h2 id="registrar-visita-title" className="mc-vendedor-modal__title">
          Registrar visita
        </h2>
        <p className="mc-vendedor-modal__sub">Anotá la tienda visitada y, si ya existe en Mi Catálogo, asociala al registro.</p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
              Nombre de la tienda
            </label>
            <input
              className="mc-input mt-2"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ej. Boutique Luna"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
              Dirección o detalle
              <span className="ml-1 font-normal normal-case tracking-normal text-mc-500">(opcional)</span>
            </label>
            <textarea
              className="mc-input mt-2 min-h-[4.5rem] resize-y"
              value={storeDetail}
              onChange={(e) => setStoreDetail(e.target.value)}
              placeholder="Ej. Centro comercial Chipichape, local 214 · Cali"
              maxLength={500}
            />
          </div>

          <div className="rounded-xl border border-neutral-200/50 bg-[#faf9f7] p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
              Asociar tienda creada
              <span className="ml-1 font-normal normal-case tracking-normal text-mc-500">(opcional)</span>
            </label>
            <p className="mt-1 text-xs leading-relaxed text-mc-500">
              Si la marca ya tiene tienda en Mi Catálogo, vinculala acá sin cambiar el resto del registro.
            </p>

            {selectedStore ? (
              <div className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-[color-mix(in_srgb,var(--mc-landing-gold)_35%,white)] bg-white px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-mc-brand-gray">{selectedStore.nombreTienda}</p>
                  {selectedStore.slug ? (
                    <p className="truncate text-xs text-mc-500">{selectedStore.slug}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-mc-600 underline decoration-neutral-300 underline-offset-2 hover:text-mc-brand-gray"
                  onClick={clearAssociation}
                >
                  Quitar
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <input
                  className="mc-input"
                  value={associateSearch}
                  onChange={(e) => setAssociateSearch(e.target.value)}
                  placeholder="Buscar por nombre o slug…"
                />
                {storesLoading ? (
                  <p className="mt-2 text-xs text-mc-500">Cargando tiendas…</p>
                ) : storesError ? (
                  <p className="mt-2 text-xs text-red-800">No se pudieron cargar las tiendas.</p>
                ) : associateSearch.trim() && associateResults.length === 0 ? (
                  <p className="mt-2 text-xs text-mc-500">Sin coincidencias.</p>
                ) : associateResults.length > 0 ? (
                  <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-neutral-200/50 bg-white p-1">
                    {associateResults.map((store) => (
                      <li key={store.id}>
                        <button
                          type="button"
                          className="flex w-full flex-col rounded-md px-3 py-2 text-left transition hover:bg-neutral-50"
                          onClick={() => associateStore(store.id)}
                        >
                          <span className="text-sm font-medium text-mc-brand-gray">{store.nombreTienda}</span>
                          {store.slug ? <span className="text-xs text-mc-500">{store.slug}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">¿Cómo te fue?</label>
            <select
              className="mc-input mt-2"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as McSalesVisitOutcome)}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {outcome === 'rechazo' ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-mc-500">
                Motivo del rechazo
              </label>
              <textarea
                className="mc-input mt-2 min-h-[5rem] resize-y"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej. No tiene presupuesto este mes"
                required
              />
            </div>
          ) : null}

          {err ? <p className="text-sm text-red-800">{err}</p> : null}

          <div className="flex gap-3 pt-2">
            <button type="button" className="mc-landing-btn-secondary flex-1 text-sm" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="mc-landing-btn-primary flex-1 text-sm" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
