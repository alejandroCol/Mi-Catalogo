import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import {
  isCollectionShowroomPubliclyActive,
  isShowroomDropLocked,
  resolveCollectionShowroom,
} from '@/lib/collectionShowroom'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { ShowroomDropRoom } from '@/public/showroom/ShowroomDropRoom'
import { ShowroomHallway } from '@/public/showroom/ShowroomHallway'
import type { McProducto } from '@/types/mc'

export function PublicShowroomPage() {
  const navigate = useNavigate()
  const { slug, to, pathBase } = usePublicStore()
  const { tenantId, tenant, loading, error } = useCatalogTenant()
  const showroom = resolveCollectionShowroom(tenant)
  const active = isCollectionShowroomPubliclyActive(tenant)

  const [products, setProducts] = useState<McProducto[]>([])
  const [locked, setLocked] = useState(false)
  const [opening, setOpening] = useState(false)
  const openingRef = useRef(false)

  useEffect(() => {
    if (!showroom) {
      setLocked(false)
      return
    }
    setLocked(isShowroomDropLocked(showroom))
  }, [showroom?.dropAtMs, showroom?.updatedAtMs, showroom])

  useEffect(() => {
    if (!tenantId || !active) return
    const q = query(
      collection(getDb(), mcProductosCollection(tenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [tenantId, active])

  const hallwayReady = useMemo(() => {
    if (!showroom) return false
    return (showroom.productIds ?? []).some((id) => products.some((p) => p.id === id))
  }, [showroom, products])

  function exit() {
    navigate(pathBase || '/')
  }

  const handleDoorOpen = useCallback(() => {
    if (openingRef.current) return
    openingRef.current = true
    setOpening(true)
    window.setTimeout(() => {
      setLocked(false)
      setOpening(false)
      openingRef.current = false
    }, 1400)
  }, [])

  if (loading) {
    return (
      <div className="mc-showroom-loading">
        <p>Abriendo el showroom…</p>
      </div>
    )
  }

  if (error || !tenant || !active || !showroom) {
    return <Navigate to={pathBase || '/'} replace />
  }

  if (locked || opening) {
    return (
      <ShowroomDropRoom
        slug={slug}
        storeName={tenant.nombreTienda}
        showroom={showroom}
        onOpened={handleDoorOpen}
        onExit={exit}
        opening={opening}
      />
    )
  }

  if (!hallwayReady) {
    return (
      <div className="mc-showroom-loading">
        <p>La colección todavía no tiene piezas en el pasillo.</p>
        <button type="button" className="mc-showroom-hall__back mt-4" onClick={exit}>
          ← Volver al catálogo
        </button>
      </div>
    )
  }

  return (
    <ShowroomHallway
      showroom={showroom}
      products={products}
      productPath={(id) => to(`/p/${id}`)}
      onExit={exit}
    />
  )
}
