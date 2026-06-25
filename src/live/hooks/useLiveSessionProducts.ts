import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcLiveSessionProductsCollection } from '@/lib/mcCollections'
import type { McLiveSessionProduct } from '@/types/mc'

function mapSessionProduct(id: string, data: Record<string, unknown>): McLiveSessionProduct {
  const snap = data.snapshot as Record<string, unknown> | undefined
  return {
    id,
    productId: String(data.productId ?? id),
    orden: typeof data.orden === 'number' ? data.orden : 0,
    pinnedAt: typeof data.pinnedAt === 'number' ? data.pinnedAt : null,
    snapshot: {
      nombre: String(snap?.nombre ?? 'Producto'),
      precioCop: typeof snap?.precioCop === 'number' ? snap.precioCop : 0,
      precioOriginalCop:
        typeof snap?.precioOriginalCop === 'number' ? snap.precioOriginalCop : undefined,
      imageUrl: typeof snap?.imageUrl === 'string' ? snap.imageUrl : undefined,
      stock: typeof snap?.stock === 'number' ? snap.stock : 0,
    },
    updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0,
  }
}

export function useLiveSessionProducts(tenantId: string | undefined, sessionId: string | undefined) {
  const [products, setProducts] = useState<McLiveSessionProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId || !sessionId) {
      setProducts([])
      setLoading(false)
      return
    }

    const q = query(
      collection(getDb(), mcLiveSessionProductsCollection(tenantId, sessionId)),
      orderBy('orden', 'asc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(snap.docs.map((d) => mapSessionProduct(d.id, d.data() as Record<string, unknown>)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return () => unsub()
  }, [tenantId, sessionId])

  return { products, loading }
}
