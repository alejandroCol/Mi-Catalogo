import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { getDb, getFirebaseFunctions } from '@/lib/firebase'
import { mcProductReviewsCollection } from '@/lib/mcCollections'
import type { McProductReview } from '@/types/mc'

export function CuentaResenasPage() {
  const { effectiveTenantId } = useMcAuth()
  const [rows, setRows] = useState<(McProductReview & { id: string })[]>([])
  const [filter, setFilter] = useState<'approved' | 'rejected'>('approved')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!effectiveTenantId) return
    const q = query(
      collection(getDb(), mcProductReviewsCollection(effectiveTenantId)),
      where('status', '==', filter),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProductReview, 'id'>) })))
      },
      () => setRows([]),
    )
  }, [effectiveTenantId, filter])

  async function moderate(reviewId: string, status: 'approved' | 'rejected') {
    setBusyId(reviewId)
    setErr(null)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcCatalogModerateProductReview')
      await fn({ reviewId, status })
    } catch {
      setErr('No se pudo actualizar la reseña.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="Reseñas del catálogo">
      <div className="mc-card space-y-4">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          Las reseñas se publican con compra verificada (nombre + N.º de pedido). Podés ocultar las que no
          quieras mostrar.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={filter === 'approved' ? 'mc-btn-primary' : 'mc-btn-secondary'}
            onClick={() => setFilter('approved')}
          >
            Publicadas
          </button>
          <button
            type="button"
            className={filter === 'rejected' ? 'mc-btn-primary' : 'mc-btn-secondary'}
            onClick={() => setFilter('rejected')}
          >
            Ocultas
          </button>
        </div>
        {err ? <p className="text-[15px] text-red-800">{err}</p> : null}
        {rows.length === 0 ? (
          <p className="ios-footnote text-[var(--cat-muted)]">No hay reseñas en esta lista.</p>
        ) : (
          <ul className="divide-y divide-neutral-200/70">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[var(--cat-text)]">
                    {r.productNombre || r.productId} · {'★'.repeat(r.rating)}
                  </p>
                  <p className="mt-1 text-[14px] text-[var(--cat-text)]">{r.comentario}</p>
                  {r.imageUrl ? (
                    <a
                      href={r.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--cat-text)] underline underline-offset-2"
                    >
                      Ver foto
                    </a>
                  ) : null}
                  <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
                    {r.clienteNombre}
                    {r.verifiedPurchase ? ' · Compra verificada' : ''} · Pedido {r.orderId}
                  </p>
                </div>
                <div className="shrink-0">
                  {filter === 'approved' ? (
                    <button
                      type="button"
                      className="mc-btn-secondary text-[13px]"
                      disabled={busyId === r.id}
                      onClick={() => void moderate(r.id, 'rejected')}
                    >
                      Ocultar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mc-btn-primary text-[13px]"
                      disabled={busyId === r.id}
                      onClick={() => void moderate(r.id, 'approved')}
                    >
                      Publicar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
