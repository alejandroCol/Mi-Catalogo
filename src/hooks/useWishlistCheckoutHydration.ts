import { useEffect, useRef, useState } from 'react'
import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { firebaseConfigured } from '@/lib/firebase'
import {
  getCatalogWishlist,
  wishlistItemsToCartLines,
  type WishlistPublicView,
} from '@/lib/wishlist'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import type { McProducto } from '@/types/mc'

/**
 * Hidrata el carrito y los datos de envío regalo desde `?w={wishlistId}`.
 */
export function useWishlistCheckoutHydration(opts: {
  slug: string | undefined
  tenantId: string | null | undefined
  searchParams: URLSearchParams
  restoreLines: (lines: LineaCarritoSimple[]) => void
  onGiftLoaded: (wishlist: WishlistPublicView) => void
}) {
  const { slug, tenantId, searchParams, restoreLines, onGiftLoaded } = opts
  const [wishlistId, setWishlistId] = useState<string | null>(null)
  const [giftWishlist, setGiftWishlist] = useState<WishlistPublicView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    const fromUrl = searchParams.get('w')?.trim() || null
    setWishlistId(fromUrl)
  }, [searchParams])

  useEffect(() => {
    if (doneRef.current) return
    if (!wishlistId || !slug || !tenantId || !firebaseConfigured) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const list = await getCatalogWishlist(slug, wishlistId)
        if (cancelled) return
        if (list.estado !== 'activa') {
          setError('Esta lista de regalos ya no acepta compras.')
          setGiftWishlist(list)
          doneRef.current = true
          return
        }

        const snap = await getDocs(
          query(
            collection(getDb(), mcProductosCollection(tenantId)),
            where('activo', '==', true),
            where('enCatalogo', '==', true),
          ),
        )
        if (cancelled) return
        const productsById = new Map(
          snap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<McProducto, 'id'>) }]),
        )
        const { lines } = wishlistItemsToCartLines(list.items, productsById)
        if (lines.length > 0) {
          restoreLines(lines)
        }
        setGiftWishlist(list)
        onGiftLoaded(list)
        doneRef.current = true
      } catch {
        if (!cancelled) setError('No pudimos cargar la lista de regalos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [wishlistId, slug, tenantId, restoreLines, onGiftLoaded])

  return { wishlistId, giftWishlist, loading, error }
}
