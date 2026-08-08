import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useMcAuth } from '@/auth/McAuthContext'
import { ImportProveedorProductSheet } from '@/components/proveedores/ImportProveedorProductSheet'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC, mcProductosCollection } from '@/lib/mcCollections'
import {
  mcMarketplaceListingsCollection,
  mcProveedorLinksCollection,
} from '@/lib/mcProveedorCollections'
import {
  mcFindProveedorByTenant,
  mcImportMarketplaceListingToStore,
} from '@/lib/mcProveedorWrites'
import type { McProducto } from '@/types/mc'
import type { McMarketplaceListing, McProveedorLink } from '@/types/mcProveedor'

type HubTab = 'catalogo' | 'mis'

export function ProveedoresHubPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { platformSettings } = usePlatformSettings()
  const { showSaveSuccess } = useSaveSuccess()
  const [tab, setTab] = useState<HubTab>('catalogo')
  const [listings, setListings] = useState<McMarketplaceListing[]>([])
  const [links, setLinks] = useState<McProveedorLink[]>([])
  const [importedProducts, setImportedProducts] = useState<(McProducto & { id: string })[]>([])
  const [q, setQ] = useState('')
  const [importing, setImporting] = useState<McMarketplaceListing | null>(null)
  const [busy, setBusy] = useState(false)
  const [hasProveedor, setHasProveedor] = useState(false)
  const [codBusy, setCodBusy] = useState(false)
  const codEnabled = tenant?.contraentregaCatalogoEnabled === true
  const soyProveedor = hasProveedor || tenant?.esProveedorActivo === true

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    void mcFindProveedorByTenant(effectiveTenantId).then((p) => setHasProveedor(!!p))
  }, [effectiveTenantId])

  useEffect(() => {
    if (!firebaseConfigured) return
    const qq = query(
      collection(getDb(), mcMarketplaceListingsCollection()),
      where('visible', '==', true),
      limit(120),
    )
    return onSnapshot(
      qq,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<McMarketplaceListing, 'id'>),
        }))
        rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        setListings(rows)
      },
      () => setListings([]),
    )
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    return onSnapshot(collection(getDb(), mcProveedorLinksCollection(effectiveTenantId)), (snap) => {
      setLinks(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProveedorLink, 'id'>) })),
      )
    })
  }, [effectiveTenantId])

  useEffect(() => {
    if (!firebaseConfigured || !effectiveTenantId) return
    return onSnapshot(
      query(collection(getDb(), mcProductosCollection(effectiveTenantId)), orderBy('orden', 'desc')),
      (snap) => {
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) }))
          .filter((p) => p.origenFulfillment === 'proveedor' && p.proveedorId)
        setImportedProducts(rows)
      },
      () => setImportedProducts([]),
    )
  }, [effectiveTenantId])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return listings
    return listings.filter(
      (l) =>
        l.nombre.toLowerCase().includes(needle) ||
        l.proveedorNombre.toLowerCase().includes(needle) ||
        (l.categoriaLabel ?? '').toLowerCase().includes(needle),
    )
  }, [listings, q])

  const proveedoresFromImports = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; count: number }>()
    for (const p of importedProducts) {
      const id = p.proveedorId!
      const prev = map.get(id)
      if (prev) {
        prev.count += 1
      } else {
        map.set(id, {
          id,
          nombre: p.proveedorNombre?.trim() || 'Proveedor',
          count: 1,
        })
      }
    }
    for (const link of links) {
      if (!map.has(link.proveedorId)) {
        map.set(link.proveedorId, {
          id: link.proveedorId,
          nombre: link.proveedorNombre,
          count: link.productosImportados || 0,
        })
      }
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [importedProducts, links])

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
      setTab('mis')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink />
        <h1 className="ios-large-title mt-3">Proveedores</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Importá productos de bodegas de la red. Ellos despachan; vos vendés con tu marca.
        </p>
        <div className="mt-3">
          <Link
            to={soyProveedor ? '/app/proveedor' : '/app/proveedor/onboarding'}
            className="text-[13px] font-medium text-[var(--cat-text)] underline underline-offset-2 decoration-neutral-300 hover:decoration-neutral-500"
          >
            {soyProveedor ? 'Abrir mi portal de proveedor' : 'Quiero vender como proveedor'}
          </Link>
        </div>
      </div>

      <div className="mc-card">
        <McToggleSwitch
          label="Contraentrega en checkout"
          description="El cliente puede pagar al recibir. Útil si importás productos de un proveedor."
          checked={codEnabled}
          disabled={codBusy || !effectiveTenantId}
          onChange={(next) => {
            if (!effectiveTenantId) return
            setCodBusy(true)
            void updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
              contraentregaCatalogoEnabled: next,
            })
              .then(() =>
                showSaveSuccess({
                  message: next ? 'Contraentrega activada' : 'Contraentrega desactivada',
                }),
              )
              .finally(() => setCodBusy(false))
          }}
        />
      </div>

      <div
        className="flex rounded-lg border border-neutral-200/60 bg-white p-0.5"
        role="tablist"
      >
        {(
          [
            ['catalogo', 'Catálogo'],
            [
              'mis',
              `Mis productos${importedProducts.length ? ` (${importedProducts.length})` : ''}`,
            ],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={clsx(
              'flex-1 rounded-md px-3 py-2 text-center text-[13px] font-medium transition',
              tab === id
                ? 'bg-neutral-100 text-[var(--cat-text)]'
                : 'text-[var(--cat-muted)] hover:text-[var(--cat-text)]',
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'catalogo' ? (
        <section className="space-y-3">
          <input
            className="mc-input"
            placeholder="Buscar producto o proveedor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {filtered.length === 0 ? (
            <div className="mc-card text-center">
              <p className="text-[15px] font-medium text-[var(--cat-text)]">
                Todavía no hay productos publicados
              </p>
              <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                Cuando un proveedor publique su bodega, vas a poder importar desde acá.
              </p>
              {!soyProveedor ? (
                <Link to="/app/proveedor/onboarding" className="mc-btn-primary mt-4 inline-flex">
                  Publicar mi bodega
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
              {filtered.map((item) => {
                const sug = item.precioSugeridoCop || Math.round(item.precioCostoCop * 1.45)
                const margen = sug - item.precioCostoCop
                return (
                  <li key={item.id} className="flex gap-3 p-3.5">
                    <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--cat-text)]">
                        {item.nombre}
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
                        {item.proveedorNombre}
                        {item.proveedorCiudad ? ` · ${item.proveedorCiudad}` : ''}
                        {' · '}
                        despacho {item.leadTimeHoras}h
                        {item.tieneVariantes ? ' · con variantes' : ''}
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[14px] font-semibold tabular-nums">
                            {formatCop(item.precioCostoCop)}
                            <span className="ml-1 text-[12px] font-normal text-[var(--cat-muted)]">
                              costo
                            </span>
                          </p>
                          <p className="text-[12px] text-[var(--cat-muted)]">
                            Margen sug. {formatCop(margen)}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="mc-btn-primary shrink-0 px-3 py-2 text-[13px]"
                          onClick={() => setImporting(item)}
                        >
                          Importar
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'mis' ? (
        <section className="space-y-5">
          {importedProducts.length === 0 && proveedoresFromImports.length === 0 ? (
            <div className="mc-card text-center">
              <p className="text-[15px] font-medium">Aún no tenés productos de reventa</p>
              <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                Importá del catálogo y van a aparecer acá con el nombre del proveedor.
              </p>
              <button type="button" className="mc-btn-primary mt-4" onClick={() => setTab('catalogo')}>
                Ver catálogo
              </button>
            </div>
          ) : (
            <>
              {proveedoresFromImports.length > 0 ? (
                <div className="space-y-2">
                  <h2 className="text-[13px] font-semibold text-[var(--cat-text)]">Proveedores</h2>
                  <ul className="divide-y divide-neutral-200/70 overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
                    {proveedoresFromImports.map((prov) => (
                      <li key={prov.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">{prov.nombre}</p>
                          <p className="mt-0.5 text-[13px] text-[var(--cat-muted)]">
                            {prov.count} en tu tienda
                          </p>
                        </div>
                        <Link
                          to={`/app/proveedores/${prov.id}`}
                          className="shrink-0 text-[13px] font-medium text-[var(--cat-text)] underline underline-offset-2 decoration-neutral-300"
                        >
                          Ver bodega
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="space-y-2">
                <h2 className="text-[13px] font-semibold text-[var(--cat-text)]">
                  Mis productos para reventa
                </h2>
                {importedProducts.length === 0 ? (
                  <div className="mc-card text-center">
                    <p className="text-[13px] text-[var(--cat-muted)]">
                      Todavía no importaste productos de estos proveedores.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-neutral-200/70 overflow-hidden rounded-xl border border-neutral-200/60 bg-white">
                    {importedProducts.map((p) => (
                      <li key={p.id} className="flex gap-3 p-3.5">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">{p.nombre}</p>
                          <p className="mt-0.5 text-[12px] text-[var(--cat-muted)]">
                            {p.proveedorNombre || 'Proveedor'}
                            {' · '}
                            venta {formatCop(p.precioCop)}
                            {' · '}
                            costo {formatCop(p.precioCostoCop ?? 0)}
                            {p.leadTimeHoras ? ` · ${p.leadTimeHoras}h` : ''}
                          </p>
                          {p.proveedorId ? (
                            <Link
                              to={`/app/proveedores/${p.proveedorId}`}
                              className="mt-1.5 inline-block text-[12px] font-medium text-[var(--cat-text)] underline underline-offset-2 decoration-neutral-300"
                            >
                              Ver más de {p.proveedorNombre || 'este proveedor'}
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

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
