/**
 * Reventa marketplace: el producto de la tienda es la fuente de verdad;
 * `mc_proveedores/.../productos` + listings son proyecciones B2B (SRP).
 */
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { mcProductosCollection } from '@/lib/mcCollections'
import {
  mcMarketplaceListingId,
  mcMarketplaceListingsCollection,
  mcProveedorProductosCollection,
  mcProveedoresCollection,
} from '@/lib/mcProveedorCollections'
import { productoUsaMatrizSku, sumarStockSkus } from '@/lib/productoSkus'
import { sumarStockTallas } from '@/lib/productoTallas'
import { sumarStockVariantes, variantesConStockDefinido } from '@/lib/productoVariantes'
import type { McProducto, McProductoReventa } from '@/types/mc'
import type {
  McMarketplaceListing,
  McProveedor,
  McProveedorLeadTime,
  McProveedorProducto,
} from '@/types/mcProveedor'

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k]
  }
  return out
}

export type ResaleOfferTerms = {
  precioCostoCop: number
  precioSugeridoCop?: number
  precioMinimoVentaCop?: number
  leadTimeHoras: McProveedorLeadTime
  marketplaceVisible?: boolean
}

/** Stock anunciado en marketplace (misma lógica que catálogo). */
export function resolveProductStockForResale(p: McProducto): number {
  if (productoUsaMatrizSku(p) && p.skus?.length) return sumarStockSkus(p.skus)
  if (p.esRopa && p.tallas?.length) return sumarStockTallas(p.tallas)
  if (p.variantes?.length && variantesConStockDefinido(p.variantes)) {
    return sumarStockVariantes(p.variantes)
  }
  return Math.max(0, Math.floor(p.stock || 0))
}

export function productHasSellableVariants(p: Pick<McProducto, 'variantes' | 'tallas' | 'skus' | 'esRopa'>): boolean {
  return !!(
    (p.variantes && p.variantes.length > 0) ||
    (p.tallas && p.tallas.length > 0) ||
    (p.skus && p.skus.length > 0)
  )
}

export function canEnableProductForResale(p: McProducto): { ok: true } | { ok: false; reason: string } {
  if (p.tipoProducto === 'combo') {
    return { ok: false, reason: 'Los combos no se pueden publicar para reventa todavía.' }
  }
  if (p.origenFulfillment === 'proveedor') {
    return { ok: false, reason: 'Este producto ya viene de otro proveedor.' }
  }
  if (p.esBorrador || !p.activo) {
    return { ok: false, reason: 'Publicá el producto en tu inventario antes de habilitar reventa.' }
  }
  if (!p.nombre?.trim()) {
    return { ok: false, reason: 'El producto necesita nombre.' }
  }
  return { ok: true }
}

/** Mapea producto canónico → oferta proveedor (proyección). */
export function mapStoreProductToProveedorOffer(
  producto: McProducto & { id: string },
  input: {
    proveedorId: string
    sourceTenantId: string
    terms: ResaleOfferTerms
    existingCreatedAt?: number
  },
): Omit<McProveedorProducto, 'id'> {
  const now = Date.now()
  const tieneVariantes = productHasSellableVariants(producto)
  return stripUndefined({
    proveedorId: input.proveedorId,
    sourceTenantId: input.sourceTenantId,
    sourceProductId: producto.id,
    nombre: producto.nombre.trim(),
    descripcion: producto.descripcion?.trim() || undefined,
    referencia: producto.referencia?.trim() || undefined,
    imageUrl: producto.imageUrl,
    galeriaImagenes: producto.galeriaImagenes?.length ? producto.galeriaImagenes : undefined,
    precioCostoCop: Math.max(0, Math.round(input.terms.precioCostoCop)),
    precioSugeridoCop:
      input.terms.precioSugeridoCop != null
        ? Math.max(0, Math.round(input.terms.precioSugeridoCop))
        : Math.max(0, Math.round(producto.precioCop)),
    stock: resolveProductStockForResale(producto),
    leadTimeHoras: input.terms.leadTimeHoras,
    precioMinimoVentaCop:
      input.terms.precioMinimoVentaCop != null
        ? Math.max(0, Math.round(input.terms.precioMinimoVentaCop))
        : undefined,
    marketplaceVisible: input.terms.marketplaceVisible !== false,
    privado: false,
    activo: true,
    orden: producto.orden ?? now,
    esRopa: producto.esRopa === true ? true : undefined,
    tallaModo: producto.tallaModo,
    imagenPrincipalColorId: producto.imagenPrincipalColorId,
    variantes: producto.variantes?.length ? producto.variantes : undefined,
    tallas: producto.tallas?.length ? producto.tallas : undefined,
    skus: producto.skus?.length ? producto.skus : undefined,
    tieneVariantes,
    createdAt: input.existingCreatedAt ?? now,
    updatedAt: now,
  }) as Omit<McProveedorProducto, 'id'>
}

async function syncMarketplaceListingFromOffer(
  proveedor: Pick<McProveedor, 'nombre' | 'ciudadBodega' | 'verificado'>,
  offer: McProveedorProducto & { id: string },
) {
  const listingId = mcMarketplaceListingId(offer.proveedorId, offer.id)
  const ref = doc(getDb(), mcMarketplaceListingsCollection(), listingId)
  const visible = !!(offer.activo && offer.marketplaceVisible && !offer.privado)
  const listing: Omit<McMarketplaceListing, 'id'> = stripUndefined({
    proveedorId: offer.proveedorId,
    proveedorProductoId: offer.id,
    sourceTenantId: offer.sourceTenantId,
    sourceProductId: offer.sourceProductId,
    proveedorNombre: proveedor.nombre,
    proveedorCiudad: proveedor.ciudadBodega,
    proveedorVerificado: proveedor.verificado === true,
    nombre: offer.nombre,
    descripcion: offer.descripcion,
    imageUrl: offer.imageUrl,
    precioCostoCop: offer.precioCostoCop,
    precioSugeridoCop: offer.precioSugeridoCop,
    stock: offer.stock,
    leadTimeHoras: offer.leadTimeHoras,
    categoriaLabel: offer.categoriaLabel,
    precioMinimoVentaCop: offer.precioMinimoVentaCop,
    tieneVariantes: offer.tieneVariantes === true,
    visible,
    updatedAt: Date.now(),
    createdAt: offer.createdAt,
  })
  await setDoc(ref, listing, { merge: true })
}

/**
 * Publica (o actualiza) un producto de tienda en el marketplace.
 * Doc id de la oferta = id del producto (relación 1:1 estable).
 */
export async function publishStoreProductForResale(input: {
  proveedorId: string
  sourceTenantId: string
  product: McProducto & { id: string }
  terms: ResaleOfferTerms
}): Promise<{ proveedorProductoId: string }> {
  const gate = canEnableProductForResale(input.product)
  if (!gate.ok) throw new Error(gate.reason)

  const db = getDb()
  const provRef = doc(db, mcProveedoresCollection(), input.proveedorId)
  const provSnap = await getDoc(provRef)
  if (!provSnap.exists()) throw new Error('Proveedor no encontrado')
  const proveedor = { id: provSnap.id, ...(provSnap.data() as Omit<McProveedor, 'id'>) }

  const offerId = input.product.id
  const offerRef = doc(db, mcProveedorProductosCollection(input.proveedorId), offerId)
  const prevSnap = await getDoc(offerRef)
  const existingCreatedAt = prevSnap.exists()
    ? (prevSnap.data() as McProveedorProducto).createdAt
    : undefined

  const offerData = mapStoreProductToProveedorOffer(input.product, {
    proveedorId: input.proveedorId,
    sourceTenantId: input.sourceTenantId,
    terms: input.terms,
    existingCreatedAt,
  })
  await setDoc(offerRef, offerData)
  await syncMarketplaceListingFromOffer(proveedor, { id: offerId, ...offerData })

  if (!prevSnap.exists()) {
    await updateDoc(provRef, {
      productosCount: Math.max(0, (proveedor.productosCount ?? 0) + 1),
      updatedAt: Date.now(),
    })
  }

  const now = Date.now()
  const reventa = stripUndefined({
    enabled: true,
    proveedorId: input.proveedorId,
    proveedorProductoId: offerId,
    precioCostoCop: offerData.precioCostoCop,
    precioSugeridoCop: offerData.precioSugeridoCop,
    precioMinimoVentaCop: offerData.precioMinimoVentaCop,
    leadTimeHoras: offerData.leadTimeHoras,
    publishedAt: input.product.reventa?.publishedAt ?? now,
    updatedAt: now,
  }) as McProductoReventa
  await updateDoc(doc(db, mcProductosCollection(input.sourceTenantId), input.product.id), {
    reventa,
    updatedAt: now,
  })

  return { proveedorProductoId: offerId }
}

/** Quita el producto del marketplace (mantiene el producto de tienda). */
export async function unpublishStoreProductResale(input: {
  proveedorId: string
  sourceTenantId: string
  productId: string
}): Promise<void> {
  const db = getDb()
  const offerId = input.productId
  const offerRef = doc(db, mcProveedorProductosCollection(input.proveedorId), offerId)
  const listingRef = doc(
    db,
    mcMarketplaceListingsCollection(),
    mcMarketplaceListingId(input.proveedorId, offerId),
  )

  const offerSnap = await getDoc(offerRef)
  await Promise.all([deleteDoc(listingRef).catch(() => undefined), deleteDoc(offerRef).catch(() => undefined)])

  if (offerSnap.exists()) {
    const provRef = doc(db, mcProveedoresCollection(), input.proveedorId)
    const provSnap = await getDoc(provRef)
    if (provSnap.exists()) {
      const count = (provSnap.data() as McProveedor).productosCount ?? 0
      await updateDoc(provRef, {
        productosCount: Math.max(0, count - 1),
        updatedAt: Date.now(),
      })
    }
  }

  const productRef = doc(db, mcProductosCollection(input.sourceTenantId), input.productId)
  const productSnap = await getDoc(productRef)
  if (productSnap.exists()) {
    const prev = productSnap.data() as McProducto
    await updateDoc(productRef, {
      reventa: stripUndefined({
        ...(prev.reventa ?? {}),
        enabled: false,
        updatedAt: Date.now(),
      }) as DocumentData,
      updatedAt: Date.now(),
    })
  }
}

/** Re-sincroniza proyección si el producto de tienda cambió (stock, variantes, fotos). */
export async function syncResaleProjectionFromStoreProduct(input: {
  proveedorId: string
  sourceTenantId: string
  product: McProducto & { id: string }
}): Promise<void> {
  const r = input.product.reventa
  if (!r?.enabled) return
  await publishStoreProductForResale({
    proveedorId: input.proveedorId,
    sourceTenantId: input.sourceTenantId,
    product: input.product,
    terms: {
      precioCostoCop: r.precioCostoCop,
      precioSugeridoCop: r.precioSugeridoCop,
      precioMinimoVentaCop: r.precioMinimoVentaCop,
      leadTimeHoras: r.leadTimeHoras,
      marketplaceVisible: true,
    },
  })
}

/** Carga oferta completa (con variantes) para import. */
export async function mcGetProveedorProductoOffer(
  proveedorId: string,
  proveedorProductoId: string,
): Promise<(McProveedorProducto & { id: string }) | null> {
  const snap = await getDoc(
    doc(getDb(), mcProveedorProductosCollection(proveedorId), proveedorProductoId),
  )
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<McProveedorProducto, 'id'>) }
}

/** Arma payload de producto de tienda importado desde una oferta. */
export function buildImportedProductFromOffer(
  offer: McProveedorProducto & { id: string },
  meta: {
    precioVentaCop: number
    proveedorNombre: string
    enCatalogo?: boolean
  },
): Omit<McProducto, 'id'> {
  const now = Date.now()
  return stripUndefined({
    nombre: offer.nombre,
    descripcion: offer.descripcion,
    referencia: offer.referencia,
    precioCop: Math.round(meta.precioVentaCop),
    precioCostoCop: offer.precioCostoCop,
    stock: Math.max(0, offer.stock),
    imageUrl: offer.imageUrl,
    galeriaImagenes: offer.galeriaImagenes,
    esRopa: offer.esRopa,
    tallaModo: offer.tallaModo,
    imagenPrincipalColorId: offer.imagenPrincipalColorId,
    variantes: offer.variantes,
    tallas: offer.tallas,
    skus: offer.skus,
    activo: true,
    enCatalogo: meta.enCatalogo !== false,
    orden: now,
    createdAt: now,
    updatedAt: now,
    origenFulfillment: 'proveedor' as const,
    proveedorId: offer.proveedorId,
    proveedorProductoId: offer.id,
    proveedorNombre: meta.proveedorNombre,
    leadTimeHoras: offer.leadTimeHoras,
  }) as Omit<McProducto, 'id'>
}

export { syncMarketplaceListingFromOffer }
