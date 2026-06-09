import { useEffect, useRef, useState } from 'react'
import { collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { mcCarritosIniciadosCollection } from '@/lib/mcCollections'
import { buscarCuponActivo, normalizeCuponCodigo } from '@/lib/checkoutPricing'
import {
  buildCarritoIniciadoPayload,
  carritoIniciadoDocPath,
  carritoIniciadoToSimpleLines,
  type CarritoCheckoutContacto,
} from '@/lib/carritoIniciado'
import {
  getOrCreateCarritoSessionToken,
  getStoredCarritoIniciadoId,
  setStoredCarritoIniciadoId,
} from '@/lib/carritoIniciadoSession'
import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import type { McCarritoIniciado, McCuponTienda, McTenant } from '@/types/mc'

export function useCarritoIniciadoCheckoutSync(opts: {
  slug: string | undefined
  tenantId: string | null | undefined
  tenant: McTenant | null | undefined
  lines: LineaCarritoSimple[]
  contacto: CarritoCheckoutContacto
  restoreLines: (lines: LineaCarritoSimple[]) => void
  setCuponAplicado: (c: McCuponTienda | null) => void
  setCuponInput: (v: string) => void
  searchParams: URLSearchParams
}) {
  const { slug, tenantId, tenant, lines, contacto, restoreLines, setCuponAplicado, setCuponInput, searchParams } =
    opts
  const [carritoIniciadoId, setCarritoIniciadoId] = useState<string | null>(null)
  const restoreDoneRef = useRef(false)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expertTracking = Boolean(slug && tenantId && tenant && firebaseConfigured)

  useEffect(() => {
    if (!slug) return
    const fromUrl = searchParams.get('r')?.trim()
    if (fromUrl) {
      setCarritoIniciadoId(fromUrl)
      setStoredCarritoIniciadoId(slug, fromUrl)
      return
    }
    setCarritoIniciadoId(getStoredCarritoIniciadoId(slug))
  }, [slug, searchParams])

  useEffect(() => {
    const cuponParam = searchParams.get('cupon')?.trim()
    if (!cuponParam || !tenant) return
    const found = buscarCuponActivo(cuponParam, tenant.cuponesCatalogo)
    if (found) {
      setCuponAplicado(found)
      setCuponInput(normalizeCuponCodigo(found.codigo))
    }
  }, [searchParams, tenant, setCuponAplicado, setCuponInput])

  useEffect(() => {
    if (restoreDoneRef.current) return
    const carritoId = searchParams.get('r')?.trim()
    if (!carritoId || !tenantId || !expertTracking) return
    let cancelled = false
    void (async () => {
      try {
        const snap = await getDoc(doc(getDb(), carritoIniciadoDocPath(tenantId, carritoId)))
        if (cancelled || !snap.exists()) return
        const data = snap.data() as McCarritoIniciado
        if (data.estado !== 'activo' || !data.lineas?.length) return
        restoreLines(carritoIniciadoToSimpleLines(data.lineas))
        restoreDoneRef.current = true
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, tenantId, expertTracking, restoreLines])

  useEffect(() => {
    if (!expertTracking || !slug || !tenantId || lines.length === 0) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    const emailLen = contacto.email?.trim().length ?? 0
    /** Guardar correo casi al instante para recuperación por email en carritos abandonados. */
    const syncDelayMs = emailLen >= 1 ? 280 : 900
    syncTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const sessionToken = getOrCreateCarritoSessionToken(slug)
          let id = carritoIniciadoId ?? getStoredCarritoIniciadoId(slug)
          const ref = id
            ? doc(getDb(), carritoIniciadoDocPath(tenantId, id))
            : doc(collection(getDb(), mcCarritosIniciadosCollection(tenantId)))

          let existing: McCarritoIniciado | undefined
          if (id) {
            const prev = await getDoc(ref)
            if (prev.exists()) existing = prev.data() as McCarritoIniciado
          }

          const payload = buildCarritoIniciadoPayload(lines, sessionToken, contacto, existing)
          await setDoc(ref, payload, { merge: true })
          const newId = ref.id
          if (!id) {
            id = newId
            setCarritoIniciadoId(newId)
            setStoredCarritoIniciadoId(slug, newId)
          }
        } catch {
          /* ignore sync errors */
        }
      })()
    }, syncDelayMs)
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    }
  }, [expertTracking, slug, tenantId, lines, contacto, carritoIniciadoId])

  return { carritoIniciadoId, expertTracking }
}
