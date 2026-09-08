import { useCallback, useEffect, useRef, useState } from 'react'
import { IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import { formatCopPlain } from '@/catalog-local/formatWhatsappCartLine'
import { getDb } from '@/lib/firebase'
import {
  fetchTenantProductsPage,
  TENANT_PRODUCTS_PAGE_SIZE,
  type TenantProductPreview,
} from '@/superadmin/fetchTenantProductsPage'
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

type Props = {
  open: boolean
  tenantId: string
  tenantName: string
  productCount: number
  onClose: () => void
}

type PageCursor = QueryDocumentSnapshot<DocumentData> | null

export function TenantProductsPreviewModal({
  open,
  tenantId,
  tenantName,
  productCount,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [products, setProducts] = useState<TenantProductPreview[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cursorsRef = useRef<PageCursor[]>([null])

  const loadPage = useCallback(
    async (pageIndex: number) => {
      setLoading(true)
      setErr(null)
      try {
        const cursor = cursorsRef.current[pageIndex] ?? null
        const result = await fetchTenantProductsPage(getDb(), tenantId, cursor)
        setProducts(result.products)
        setHasMore(result.hasMore)
        if (result.lastDoc) {
          const next = [...cursorsRef.current]
          next[pageIndex + 1] = result.lastDoc
          cursorsRef.current = next
        }
      } catch {
        setErr('No se pudieron cargar los productos.')
        setProducts([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [tenantId],
  )

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setPage(0)
    cursorsRef.current = [null]
    void loadPage(0)
  }, [open, tenantId, loadPage])

  useEffect(() => {
    if (!open || page === 0) return
    void loadPage(page)
  }, [open, page, loadPage])

  if (!open) return null

  const totalPages = hasMore ? page + 2 : Math.max(page + 1, productCount > 0 ? 1 : 0)
  const pageLabel =
    productCount <= TENANT_PRODUCTS_PAGE_SIZE
      ? `${productCount} producto${productCount === 1 ? '' : 's'}`
      : `Página ${page + 1}${totalPages > 1 ? ` · ${productCount} en total` : ''}`

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/45"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div
        className="mx-auto flex h-full max-h-svh w-full max-w-lg flex-col px-4 py-6 sm:py-10"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mc-card flex min-h-0 flex-1 flex-col overflow-hidden shadow-xl ring-1 ring-neutral-200/60">
          <div className="shrink-0 border-b border-neutral-200/50 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-mc-500">Productos</p>
            <h2 className="ios-headline mt-1 truncate text-mc-900">{tenantName}</h2>
            <p className="ios-footnote mt-1 text-mc-600">{pageLabel}</p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-mc-200 border-t-mc-900"
                  aria-hidden
                />
                <p className="text-[13px] text-mc-600">Cargando productos…</p>
              </div>
            ) : err ? (
              <p className="py-8 text-center text-[13px] text-red-800">{err}</p>
            ) : products.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-mc-500">Esta tienda aún no tiene productos.</p>
            ) : (
              <ul className="divide-y divide-mc-100" role="list">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg border border-mc-200/80 object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-mc-200/80 bg-mc-50 text-[11px] font-medium text-mc-400"
                        aria-hidden
                      >
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-mc-900">{p.nombre}</p>
                      <p className="mt-0.5 text-[12px] text-mc-500">
                        {p.referencia ? `${p.referencia} · ` : ''}
                        {formatCopPlain(p.precioCop)}
                        {p.enCatalogo === false ? ' · oculto' : ''}
                        {p.activo === false ? ' · inactivo' : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="shrink-0 border-t border-neutral-200/50 px-5 py-4">
            {productCount > TENANT_PRODUCTS_PAGE_SIZE ? (
              <div className="mb-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-mc-200/90 px-3 py-2 text-[13px] font-medium text-mc-900 disabled:opacity-40"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <IconChevronLeft size={16} />
                  Anterior
                </button>
                <span className="text-[12px] tabular-nums text-mc-500">Pág. {page + 1}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-mc-200/90 px-3 py-2 text-[13px] font-medium text-mc-900 disabled:opacity-40"
                  disabled={!hasMore || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <IconChevronRight size={16} />
                </button>
              </div>
            ) : null}
            <button type="button" className="mc-btn-primary w-full py-3" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}
