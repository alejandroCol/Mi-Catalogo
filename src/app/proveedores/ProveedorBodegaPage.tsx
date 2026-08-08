import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useMcAuth } from '@/auth/McAuthContext'
import { ImportProveedorProductSheet } from '@/components/proveedores/ImportProveedorProductSheet'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { mcMarketplaceListingsCollection } from '@/lib/mcProveedorCollections'
import { mcImportMarketplaceListingToStore } from '@/lib/mcProveedorWrites'
import type { McMarketplaceListing } from '@/types/mcProveedor'

export function ProveedorBodegaPage() {
  const { proveedorId = '' } = useParams<{ proveedorId: string }>()
  const { effectiveTenantId } = useMcAuth()
  const { platformSettings } = usePlatformSettings()
  const { showSaveSuccess } = useSaveSuccess()
  const [listings, setListings] = useState<McMarketplaceListing[]>([])
  const [importing, setImporting] = useState<McMarketplaceListing | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!firebaseConfigured || !proveedorId) return
    const qq = query(
      collection(getDb(), mcMarketplaceListingsCollection()),
      where('proveedorId', '==', proveedorId),
      limit(120),
    )
    return onSnapshot(
      qq,
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<McMarketplaceListing, 'id'>) }))
          .filter((l) => l.visible)
        rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        setListings(rows)
      },
      () => setListings([]),
    )
  }, [proveedorId])

  const proveedorNombre = useMemo(
    () => listings[0]?.proveedorNombre ?? 'Proveedor',
    [listings],
  )
  const ciudad = listings[0]?.proveedorCiudad

  async function handleImport(precioVentaCop: number) {
    if (!importing || !effectiveTenantId) return
    setBusy(true)
    try {
      await mcImportMarketplaceListingToStore({
        tenantId: effectiveTenantId,
        listing: importing,
        precioVentaCop,
        platformSettings,
      })
      showSaveSuccess({ message: 'Producto agregado a tu inventario' })
      setImporting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to="/app/proveedores" label="← Proveedores" />
        <h1 className="ios-large-title mt-3">{proveedorNombre}</h1>
        <p className="ios-subhead mt-2 text-[var(--cat-muted)]">
          Productos disponibles para reventa
          {ciudad ? ` · ${ciudad}` : ''}
          {listings.length ? ` · ${listings.length} producto${listings.length === 1 ? '' : 's'}` : ''}
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="mc-card text-center">
          <p className="text-[15px] font-medium">Sin productos públicos</p>
          <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
            Este proveedor todavía no tiene ofertas visibles en el marketplace.
          </p>
          <Link to="/app/proveedores" className="mc-btn-secondary mt-4 inline-flex">
            Volver
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listings.map((item) => {
            const sug = item.precioSugeridoCop || Math.round(item.precioCostoCop * 1.45)
            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-neutral-200/60 bg-white"
              >
                <div className="aspect-square bg-neutral-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--cat-text)]">
                    {item.nombre}
                  </p>
                  <p className="text-[11px] text-[var(--cat-muted)]">
                    Costo {formatCop(item.precioCostoCop)}
                    {' · '}
                    {item.leadTimeHoras}h
                    {item.tieneVariantes ? ' · variantes' : ''}
                  </p>
                  <p className="text-[11px] text-[var(--cat-muted)]">
                    Sug. {formatCop(sug)}
                  </p>
                  <button
                    type="button"
                    className="mc-btn-primary mt-auto w-full py-2 text-[12px]"
                    onClick={() => setImporting(item)}
                  >
                    Importar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {importing ? (
        <ImportProveedorProductSheet
          listing={importing}
          busy={busy}
          onClose={() => setImporting(null)}
          onImport={handleImport}
        />
      ) : null}
    </div>
  )
}
