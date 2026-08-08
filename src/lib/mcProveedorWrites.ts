import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { mcCreateProducto } from '@/lib/mcWrites'
import {
  mcMarketplaceListingId,
  mcMarketplaceListingsCollection,
  mcProveedorLinksCollection,
  mcProveedorOrdenesCollection,
  mcProveedorProductosCollection,
  mcProveedoresCollection,
} from '@/lib/mcProveedorCollections'
import type { McOrdenCatalogo, McPlatformSettings, McProducto, McTenant } from '@/types/mc'
import type {
  McMarketplaceListing,
  McProveedor,
  McProveedorLeadTime,
  McProveedorLiquidacionEstado,
  McProveedorPo,
  McProveedorPoEstado,
  McProveedorProducto,
} from '@/types/mcProveedor'

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k]
  }
  return out
}

export async function mcFindProveedorByOwner(uid: string): Promise<(McProveedor & { id: string }) | null> {
  const q = query(collection(getDb(), mcProveedoresCollection()), where('ownerUid', '==', uid))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]!
  return { id: d.id, ...(d.data() as Omit<McProveedor, 'id'>) }
}

export async function mcFindProveedorByTenant(
  tenantId: string,
): Promise<(McProveedor & { id: string }) | null> {
  const q = query(
    collection(getDb(), mcProveedoresCollection()),
    where('sourceTenantId', '==', tenantId),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]!
  return { id: d.id, ...(d.data() as Omit<McProveedor, 'id'>) }
}

export async function mcRegisterProveedor(input: {
  ownerUid: string
  sourceTenantId?: string
  nombre: string
  razonSocial?: string
  rut?: string
  whatsapp: string
  email?: string
  ciudadBodega: string
  departamentoBodega?: string
  direccionBodega?: string
  horariosDespacho?: string
  logisticaModo?: McProveedor['logisticaModo']
  bancoNombre?: string
  bancoTipoCuenta?: string
  bancoNumeroCuenta?: string
  bancoTitular?: string
  bio?: string
}): Promise<{ id: string }> {
  const db = getDb()
  const existing = await mcFindProveedorByOwner(input.ownerUid)
  if (existing) return { id: existing.id }

  const now = Date.now()
  const ref = doc(collection(db, mcProveedoresCollection()))
  const data: Omit<McProveedor, 'id'> = stripUndefined({
    ownerUid: input.ownerUid,
    sourceTenantId: input.sourceTenantId,
    nombre: input.nombre.trim(),
    razonSocial: input.razonSocial?.trim() || undefined,
    rut: input.rut?.trim() || undefined,
    whatsapp: input.whatsapp.trim(),
    email: input.email?.trim() || undefined,
    ciudadBodega: input.ciudadBodega.trim(),
    departamentoBodega: input.departamentoBodega?.trim() || undefined,
    direccionBodega: input.direccionBodega?.trim() || undefined,
    horariosDespacho: input.horariosDespacho?.trim() || undefined,
    logisticaModo: input.logisticaModo ?? 'manual',
    bancoNombre: input.bancoNombre?.trim() || undefined,
    bancoTipoCuenta: input.bancoTipoCuenta?.trim() || undefined,
    bancoNumeroCuenta: input.bancoNumeroCuenta?.trim() || undefined,
    bancoTitular: input.bancoTitular?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    onboardingCompleto: true,
    activo: true,
    publico: true,
    verificado: false,
    productosCount: 0,
    pedidosPendientes: 0,
    porCobrarCop: 0,
    createdAt: now,
    updatedAt: now,
  })
  await setDoc(ref, data)

  if (input.sourceTenantId) {
    await updateDoc(doc(db, MC.tenants, input.sourceTenantId), {
      proveedorId: ref.id,
      esProveedorActivo: true,
    })
  }

  return { id: ref.id }
}

export async function mcUpdateProveedor(
  proveedorId: string,
  patch: Partial<Omit<McProveedor, 'id' | 'ownerUid' | 'createdAt'>>,
) {
  await updateDoc(doc(getDb(), mcProveedoresCollection(), proveedorId), {
    ...stripUndefined(patch as DocumentData),
    updatedAt: Date.now(),
  })
}

async function syncMarketplaceListing(
  proveedor: Pick<McProveedor, 'nombre' | 'ciudadBodega' | 'verificado'>,
  producto: McProveedorProducto & { id: string },
) {
  const listingId = mcMarketplaceListingId(producto.proveedorId, producto.id)
  const ref = doc(getDb(), mcMarketplaceListingsCollection(), listingId)
  const visible = !!(producto.activo && producto.marketplaceVisible && !producto.privado)
  const listing: Omit<McMarketplaceListing, 'id'> = stripUndefined({
    proveedorId: producto.proveedorId,
    proveedorProductoId: producto.id,
    sourceTenantId: producto.sourceTenantId,
    sourceProductId: producto.sourceProductId,
    proveedorNombre: proveedor.nombre,
    proveedorCiudad: proveedor.ciudadBodega,
    proveedorVerificado: proveedor.verificado === true,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    imageUrl: producto.imageUrl,
    precioCostoCop: producto.precioCostoCop,
    precioSugeridoCop: producto.precioSugeridoCop,
    stock: producto.stock,
    leadTimeHoras: producto.leadTimeHoras,
    categoriaLabel: producto.categoriaLabel,
    precioMinimoVentaCop: producto.precioMinimoVentaCop,
    tieneVariantes: producto.tieneVariantes === true,
    visible,
    updatedAt: Date.now(),
    createdAt: producto.createdAt,
  })
  await setDoc(ref, listing, { merge: true })
}

export async function mcCreateProveedorProducto(
  proveedorId: string,
  input: {
    nombre: string
    descripcion?: string
    imageUrl?: string
    precioCostoCop: number
    precioSugeridoCop?: number
    stock: number
    leadTimeHoras: McProveedorLeadTime
    categoriaLabel?: string
    marketplaceVisible?: boolean
    privado?: boolean
    precioMinimoVentaCop?: number
    pesoGramos?: number
  },
): Promise<{ id: string }> {
  const db = getDb()
  const provSnap = await getDoc(doc(db, mcProveedoresCollection(), proveedorId))
  if (!provSnap.exists()) throw new Error('Proveedor no encontrado')
  const proveedor = { id: provSnap.id, ...(provSnap.data() as Omit<McProveedor, 'id'>) }

  const now = Date.now()
  const ref = doc(collection(db, mcProveedorProductosCollection(proveedorId)))
  const data: Omit<McProveedorProducto, 'id'> = stripUndefined({
    proveedorId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || undefined,
    imageUrl: input.imageUrl,
    precioCostoCop: Math.max(0, Math.round(input.precioCostoCop)),
    precioSugeridoCop:
      input.precioSugeridoCop != null
        ? Math.max(0, Math.round(input.precioSugeridoCop))
        : undefined,
    stock: Math.max(0, Math.floor(input.stock)),
    leadTimeHoras: input.leadTimeHoras,
    categoriaLabel: input.categoriaLabel?.trim() || undefined,
    marketplaceVisible: input.marketplaceVisible !== false,
    privado: input.privado === true,
    precioMinimoVentaCop:
      input.precioMinimoVentaCop != null
        ? Math.max(0, Math.round(input.precioMinimoVentaCop))
        : undefined,
    pesoGramos: input.pesoGramos,
    activo: true,
    orden: now,
    createdAt: now,
    updatedAt: now,
  })
  await setDoc(ref, data)
  await syncMarketplaceListing(proveedor, { id: ref.id, ...data })
  await updateDoc(doc(db, mcProveedoresCollection(), proveedorId), {
    productosCount: Math.max(0, (proveedor.productosCount ?? 0) + 1),
    updatedAt: now,
  })
  return { id: ref.id }
}

export async function mcUpdateProveedorProducto(
  proveedorId: string,
  productoId: string,
  patch: Partial<Omit<McProveedorProducto, 'id' | 'proveedorId' | 'createdAt'>>,
) {
  const db = getDb()
  const prodRef = doc(db, mcProveedorProductosCollection(proveedorId), productoId)
  const now = Date.now()
  await updateDoc(prodRef, { ...stripUndefined(patch as DocumentData), updatedAt: now })

  const [provSnap, prodSnap] = await Promise.all([
    getDoc(doc(db, mcProveedoresCollection(), proveedorId)),
    getDoc(prodRef),
  ])
  if (!provSnap.exists() || !prodSnap.exists()) return
  const proveedor = provSnap.data() as McProveedor
  const producto = { id: prodSnap.id, ...(prodSnap.data() as Omit<McProveedorProducto, 'id'>) }
  await syncMarketplaceListing(proveedor, producto)
}

export async function mcImportMarketplaceListingToStore(input: {
  tenantId: string
  listing: McMarketplaceListing
  precioVentaCop: number
  enCatalogo?: boolean
  platformSettings?: McPlatformSettings | null
}): Promise<{ id: string }> {
  const { tenantId, listing, precioVentaCop, enCatalogo = true, platformSettings } = input
  if (precioVentaCop < listing.precioCostoCop) {
    throw new Error(
      `El precio de venta no puede ser menor al costo ($${listing.precioCostoCop.toLocaleString('es-CO')})`,
    )
  }
  if (listing.precioMinimoVentaCop != null && precioVentaCop < listing.precioMinimoVentaCop) {
    throw new Error(
      `El precio mínimo de venta es $${listing.precioMinimoVentaCop.toLocaleString('es-CO')}`,
    )
  }
  if (listing.sourceTenantId && listing.sourceTenantId === tenantId) {
    throw new Error('No podés importar un producto de tu propia bodega.')
  }

  const { buildImportedProductFromOffer, mcGetProveedorProductoOffer } = await import(
    '@/lib/mcProveedorResale'
  )
  const offer = await mcGetProveedorProductoOffer(listing.proveedorId, listing.proveedorProductoId)

  const now = Date.now()
  const margen = Math.max(0, precioVentaCop - listing.precioCostoCop)
  const product: Omit<McProducto, 'id'> = offer
    ? buildImportedProductFromOffer(offer, {
        precioVentaCop,
        proveedorNombre: listing.proveedorNombre,
        enCatalogo,
      })
    : stripUndefined({
        nombre: listing.nombre,
        descripcion: listing.descripcion,
        precioCop: Math.round(precioVentaCop),
        precioCostoCop: listing.precioCostoCop,
        stock: Math.max(0, listing.stock),
        imageUrl: listing.imageUrl,
        activo: true,
        enCatalogo,
        orden: now,
        createdAt: now,
        updatedAt: now,
        origenFulfillment: 'proveedor' as const,
        proveedorId: listing.proveedorId,
        proveedorProductoId: listing.proveedorProductoId,
        proveedorNombre: listing.proveedorNombre,
        leadTimeHoras: listing.leadTimeHoras,
      })

  const created = await mcCreateProducto(tenantId, product, platformSettings)

  const linkRef = doc(getDb(), mcProveedorLinksCollection(tenantId), listing.proveedorId)
  const linkSnap = await getDoc(linkRef)
  if (linkSnap.exists()) {
    const prev = linkSnap.data() as { productosImportados?: number }
    await updateDoc(linkRef, {
      activo: true,
      proveedorNombre: listing.proveedorNombre,
      productosImportados: Math.max(0, (prev.productosImportados ?? 0) + 1),
      updatedAt: now,
      lastImportProductId: created.id,
      lastMargenCop: margen,
    })
  } else {
    await setDoc(linkRef, {
      proveedorId: listing.proveedorId,
      proveedorNombre: listing.proveedorNombre,
      activo: true,
      productosImportados: 1,
      createdAt: now,
      updatedAt: now,
      lastImportProductId: created.id,
      lastMargenCop: margen,
    })
  }

  return created
}

export async function mcEnsureSupplierPosForOrder(input: {
  tenant: McTenant
  ordenId: string
  orden: McOrdenCatalogo
  productosById: Map<string, McProducto>
}): Promise<string[]> {
  const { tenant, ordenId, orden, productosById } = input
  if (orden.proveedorPosCreadosAt && orden.proveedorPoIds?.length) {
    return orden.proveedorPoIds
  }
  const isCod = orden.pagoContraEntrega === true
  if (!isCod && (orden.estado === 'esperando_pago' || orden.estado === 'cancelado')) return []
  if (isCod && orden.estado === 'cancelado') return []

  const groups = new Map<
    string,
    {
      proveedorId: string
      proveedorNombre: string
      lineas: McProveedorPo['lineas']
    }
  >()

  for (const line of orden.lineas ?? []) {
    const prod = productosById.get(line.productId)
    const proveedorId = prod?.proveedorId || line.proveedorId
    if (!proveedorId || prod?.origenFulfillment !== 'proveedor') continue
    const g = groups.get(proveedorId) ?? {
      proveedorId,
      proveedorNombre: prod?.proveedorNombre || 'Proveedor',
      lineas: [],
    }
    g.lineas.push({
      proveedorProductoId: prod?.proveedorProductoId || '',
      storeProductId: line.productId,
      nombre: line.nombre,
      cantidad: line.cantidad,
      costoUnitarioCop: prod?.precioCostoCop ?? line.costoUnitarioCop ?? 0,
      precioVentaUnitarioCop: line.precioUnitarioCop,
    })
    groups.set(proveedorId, g)
  }

  if (groups.size === 0) return []

  const db = getDb()
  const now = Date.now()
  const poIds: string[] = []
  const batch = writeBatch(db)

  for (const g of groups.values()) {
    const poRef = doc(collection(db, mcProveedorOrdenesCollection(g.proveedorId)))
    const costoTotalCop = g.lineas.reduce((s, l) => s + l.costoUnitarioCop * l.cantidad, 0)
    const ventaLineas = g.lineas.reduce(
      (s, l) => s + (l.precioVentaUnitarioCop ?? 0) * l.cantidad,
      0,
    )
    const montoRecaudar =
      isCod
        ? Math.round(
            orden.montoRecaudarCop != null && orden.montoRecaudarCop > 0
              ? // Prorrateo simple si hay varios proveedores: por venta de líneas de este PO
                groups.size === 1
                  ? orden.montoRecaudarCop
                  : ventaLineas > 0
                    ? ventaLineas
                    : costoTotalCop
              : ventaLineas > 0
                ? ventaLineas
                : orden.totalCop,
          )
        : undefined
    const po: Omit<McProveedorPo, 'id'> = stripUndefined({
      proveedorId: g.proveedorId,
      proveedorNombre: g.proveedorNombre,
      storeTenantId: tenant.id,
      storeNombre: tenant.nombreTienda,
      storeOrdenId: ordenId,
      storeOrdenRef: orden.numeroReferencia,
      estado: 'nuevo' as McProveedorPoEstado,
      lineas: g.lineas,
      costoTotalCop,
      clienteNombre: orden.clienteNombre,
      clienteTelefono: orden.clienteTelefono,
      envioCiudad: orden.envioCiudad,
      envioDepartamento: orden.envioDepartamento,
      envioDireccion: orden.envioDireccion,
      envioReferencia: orden.envioReferencia,
      liquidacionEstado: 'por_cobrar' as McProveedorLiquidacionEstado,
      pagoContraEntrega: isCod || undefined,
      montoRecaudarCop: montoRecaudar,
      recaudoEstado: isCod ? ('pendiente' as const) : undefined,
      createdAt: now,
      updatedAt: now,
    })
    batch.set(poRef, po)
    poIds.push(poRef.id)
  }

  const ordenRef = doc(db, `mc_tenants/${tenant.id}/ordenes_catalogo`, ordenId)
  batch.update(ordenRef, {
    proveedorPosCreadosAt: now,
    proveedorPoIds: poIds,
    updatedAt: now,
  })

  await batch.commit()
  return poIds
}

export async function mcUpdateProveedorPoEstado(input: {
  proveedorId: string
  poId: string
  estado: McProveedorPoEstado
  trackingNumber?: string
  trackingImageUrl?: string
  notaProveedor?: string
}) {
  const db = getDb()
  const poRef = doc(db, mcProveedorOrdenesCollection(input.proveedorId), input.poId)
  const snap = await getDoc(poRef)
  if (!snap.exists()) throw new Error('Pedido no encontrado')
  const now = Date.now()
  const patch: Record<string, unknown> = {
    estado: input.estado,
    updatedAt: now,
  }
  if (input.trackingNumber != null) patch.trackingNumber = input.trackingNumber.trim() || undefined
  if (input.trackingImageUrl != null) patch.trackingImageUrl = input.trackingImageUrl
  if (input.notaProveedor != null) patch.notaProveedor = input.notaProveedor
  if (input.estado === 'aceptado') patch.aceptadoAt = now
  if (input.estado === 'despachado') patch.despachadoAt = now
  if (input.estado === 'entregado') patch.entregadoAt = now
  if (input.estado === 'rechazado') patch.rechazadoAt = now

  await updateDoc(poRef, stripUndefined(patch))
}

export async function mcMarkProveedorPoLiquidacion(input: {
  proveedorId: string
  poId: string
  estado: McProveedorLiquidacionEstado
}) {
  const db = getDb()
  const poRef = doc(db, mcProveedorOrdenesCollection(input.proveedorId), input.poId)
  const snap = await getDoc(poRef)
  if (!snap.exists()) throw new Error('Pedido no encontrado')
  const now = Date.now()
  await updateDoc(poRef, {
    liquidacionEstado: input.estado,
    liquidacionPagadoAt: input.estado === 'pagado' ? now : null,
    updatedAt: now,
  })
}

export type McRecaudoCodEstado = 'pendiente' | 'recaudado' | 'no_entregado' | 'devuelto'

/** Confirma el recaudo COD en puerta (proveedor o tienda). */
export async function mcUpdateProveedorPoRecaudo(input: {
  proveedorId: string
  poId: string
  recaudoEstado: McRecaudoCodEstado
  /** Si true, también marca el PO como entregado cuando hay recaudo. */
  marcarEntregado?: boolean
}) {
  const db = getDb()
  const poRef = doc(db, mcProveedorOrdenesCollection(input.proveedorId), input.poId)
  const snap = await getDoc(poRef)
  if (!snap.exists()) throw new Error('Pedido no encontrado')
  const po = snap.data() as McProveedorPo
  if (!po.pagoContraEntrega) throw new Error('Este pedido no es contraentrega')

  const now = Date.now()
  const patch: Record<string, unknown> = {
    recaudoEstado: input.recaudoEstado,
    updatedAt: now,
  }
  if (input.recaudoEstado === 'recaudado') {
    patch.recaudadoAt = now
    if (input.marcarEntregado !== false) {
      patch.estado = 'entregado'
      patch.entregadoAt = now
    }
  }
  if (input.recaudoEstado === 'no_entregado' || input.recaudoEstado === 'devuelto') {
    patch.estado = 'cancelado'
    patch.liquidacionEstado = 'pagado' // no hay deuda: no se recaudó
    patch.liquidacionPagadoAt = now
  }

  await updateDoc(poRef, stripUndefined(patch))

  // Espejo en la orden de la tienda (si las rules lo permiten)
  const storeOrdenRef = doc(
    db,
    `mc_tenants/${po.storeTenantId}/ordenes_catalogo`,
    po.storeOrdenId,
  )
  const storePatch: Record<string, unknown> = {
    estadoPagoCod: input.recaudoEstado,
    updatedAt: now,
  }
  if (input.recaudoEstado === 'recaudado') {
    storePatch.recaudadoCodAt = now
    storePatch.estado = 'entregado'
    storePatch.seguimientoEntregaAt = now
  }
  if (input.recaudoEstado === 'no_entregado' || input.recaudoEstado === 'devuelto') {
    storePatch.estado = 'cancelado'
  }
  try {
    await updateDoc(storeOrdenRef, storePatch)
  } catch {
    // la tienda puede actualizar desde Pedidos si falla por rules
  }
}
