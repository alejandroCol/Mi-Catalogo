import { randomBytes } from 'node:crypto'
import type { DocumentReference, Firestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { resolveCheckoutEnvioCop } from '../shipping/resolveCheckoutEnvio.js'
import { productoPrecioVentaFromData } from '../productoDescuento.js'
import {
  enrichLineasWithComboCost,
  validateCatalogLineStock,
} from '../catalogInventoryFulfill.js'
import { isReservedStoreSlug } from '../storePublicUrl.js'
import { isTenantMembershipActive } from '../tenantMembership.js'
import {
  buscarCuponActivo,
  descuentoDesdeCupon,
  normalizeCuponCodigo,
  totalCheckoutCop,
} from './catalogPricing.js'

type ComboColorSeleccion = {
  componenteIndex: number
  slotIndex: number
  varianteId?: string
  varianteNombre?: string
  tallaId?: string
  tallaNombre?: string
}

type CatalogLineaRes = {
  productId: string
  nombre: string
  cantidad: number
  precioUnitarioCop: number
  costoUnitarioCop?: number
  varianteId?: string
  tallaId?: string
  esCombo?: boolean
  comboColorSeleccion?: ComboColorSeleccion[]
  componentesExpandidos?: {
    productId: string
    varianteId?: string
    tallaId?: string
    cantidad: number
    costoUnitarioCop?: number
    nombre?: string
    varianteNombre?: string
    tallaNombre?: string
  }[]
}

export type CatalogCheckoutLineaIn = {
  productId?: string
  cantidad?: number
  varianteId?: string
  tallaId?: string
  comboColorSeleccion?: unknown[]
}

export type CatalogCheckoutInput = {
  slug: string
  lineas: CatalogCheckoutLineaIn[]
  cuponCodigo?: string
  nombre: string
  telefono: string
  email: string
  nota?: string
  envioCiudad: string
  envioDepartamento: string
  envioDireccion: string
  envioReferencia?: string
  clienteTipoDocumento: string
  clienteDocumentoNumero: string
  carritoIniciadoId?: string
  esRegalo?: boolean
  wishlistId?: string
  destinatarioNombre?: string
  enviaToken: string
  /** Flags extra del proveedor de pago (Addi, etc.). */
  paymentSeed: Record<string, unknown>
}

export type BuiltCatalogOrder = {
  tenantId: string
  slug: string
  orderId: string
  orderRef: DocumentReference
  viewToken: string
  totalFinal: number
  envioCop: number
  subtotalCop: number
  lineasRes: CatalogLineaRes[]
  cliente: {
    nombre: string
    telefono: string
    email: string
    tipoDocumento: string
    documentoNumero: string
  }
  envio: {
    ciudad: string
    departamento: string
    direccion: string
    referencia?: string
  }
  tenantNombreTienda: string
  tenantLogoUrl?: string
}

function buildNumeroReferencia(orderId: string): string {
  const tail = orderId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()
  return `MC-${tail.length >= 4 ? tail : orderId.slice(0, 8).toUpperCase()}`
}

function newViewToken(): string {
  return randomBytes(20).toString('hex')
}

/**
 * Construye y persiste un pedido `esperando_pago` sin acoplarse a OnePay/Addi.
 * DIP: el caller inyecta `paymentSeed` (flags del proveedor).
 */
export async function buildAndPersistCatalogCheckoutOrder(
  db: Firestore,
  input: CatalogCheckoutInput,
): Promise<BuiltCatalogOrder> {
  const slug = input.slug.trim().toLowerCase()
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug) || isReservedStoreSlug(slug)) {
    throw new HttpsError('invalid-argument', 'Slug inválido.')
  }
  const lineas = Array.isArray(input.lineas) ? input.lineas : []
  if (lineas.length === 0 || lineas.length > 100) {
    throw new HttpsError('invalid-argument', 'Carrito inválido.')
  }

  const nombre = input.nombre.trim()
  const telefono = input.telefono.trim()
  if (!nombre || !telefono) {
    throw new HttpsError('invalid-argument', 'Nombre y teléfono son obligatorios.')
  }
  const tipoDocRaw = input.clienteTipoDocumento.trim().toUpperCase()
  const numDocRaw = input.clienteDocumentoNumero.trim()
  const docTiposOk = new Set(['CC', 'CE', 'TI', 'PA', 'NIT', 'PEP', 'OTRO'])
  if (!tipoDocRaw || !docTiposOk.has(tipoDocRaw)) {
    throw new HttpsError('invalid-argument', 'Seleccioná un tipo de documento válido.')
  }
  if (!numDocRaw || numDocRaw.length < 5) {
    throw new HttpsError('invalid-argument', 'Ingresá el número de documento.')
  }
  const envioCiudad = input.envioCiudad.trim()
  const envioDepartamento = input.envioDepartamento.trim()
  const envioDireccion = input.envioDireccion.trim()
  if (!envioDepartamento || !envioCiudad || !envioDireccion) {
    throw new HttpsError('invalid-argument', 'Departamento, ciudad y dirección de envío son obligatorias.')
  }
  const email = input.email.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'Correo electrónico obligatorio y válido.')
  }

  const slugSnap = await db.doc(`mc_slugs/${slug}`).get()
  if (!slugSnap.exists || (slugSnap.data() as { active?: boolean }).active !== true) {
    throw new HttpsError('not-found', 'Tienda no disponible.')
  }
  const tenantId = (slugSnap.data() as { tenantId: string }).tenantId
  if (!tenantId) throw new HttpsError('not-found', 'Tienda no encontrada.')

  const tenantSnap = await db.doc(`mc_tenants/${tenantId}`).get()
  if (!tenantSnap.exists) throw new HttpsError('not-found', 'Tienda no encontrada.')
  const tenant = tenantSnap.data() as {
    billingPlan?: string
    subscriptionEndsAt?: number
    nombreTienda?: string
    storeLogoUrl?: string
    envioEstimadoCop?: number
    envioEstimadoEtiqueta?: string
    envioPorCiudad?: { ciudad?: string; cop?: number; departamento?: string }[]
    envioGratisDesdeCop?: number
    envioUsarTarifasMicatalogo?: boolean
    envioCotizarAutomatico?: boolean
    envioOrigenDepartamento?: string
    envioOrigenCiudad?: string
    envioOrigenDireccion?: string
    envioOrigenTelefono?: string
    envioEmpaquePesoKg?: number
    envioEmpaqueLargoCm?: number
    envioEmpaqueAnchoCm?: number
    envioEmpaqueAltoCm?: number
    cuponesCatalogo?: {
      codigo: string
      activo?: boolean
      tipo: 'porcentaje' | 'monto_fijo'
      valor: number
    }[]
  }
  if (!isTenantMembershipActive(tenant)) {
    throw new HttpsError('failed-precondition', 'Catálogo pausado.')
  }

  const platformSettingsSnap = await db.doc('mc_platform/settings').get()
  const platformSettings = platformSettingsSnap.data() as
    | {
        envioMicatalogoEstimadoCop?: number
        envioMicatalogoPorCiudad?: { ciudad?: string; cop?: number }[]
      }
    | undefined

  const lineasRes: CatalogLineaRes[] = []
  for (const raw of lineas) {
    const productId = typeof raw?.productId === 'string' ? raw.productId.trim() : ''
    const cant = typeof raw?.cantidad === 'number' && raw.cantidad > 0 ? Math.floor(raw.cantidad) : 0
    if (!productId || cant < 1) {
      throw new HttpsError('invalid-argument', 'Línea de carrito inválida.')
    }
    const varianteId = typeof raw?.varianteId === 'string' ? raw.varianteId.trim() : undefined
    const tallaId = typeof raw?.tallaId === 'string' ? raw.tallaId.trim() : undefined
    const comboColorSeleccion: ComboColorSeleccion[] | undefined = Array.isArray(
      raw?.comboColorSeleccion,
    )
      ? raw.comboColorSeleccion
          .map((x): ComboColorSeleccion | null => {
            if (!x || typeof x !== 'object') return null
            const o = x as Record<string, unknown>
            const componenteIndex =
              typeof o.componenteIndex === 'number' ? Math.floor(o.componenteIndex) : -1
            const slotIndex = typeof o.slotIndex === 'number' ? Math.floor(o.slotIndex) : -1
            const vid = typeof o.varianteId === 'string' ? o.varianteId.trim() : ''
            if (componenteIndex < 0 || slotIndex < 0 || !vid) return null
            return {
              componenteIndex,
              slotIndex,
              varianteId: vid,
              ...(typeof o.varianteNombre === 'string' && o.varianteNombre.trim()
                ? { varianteNombre: o.varianteNombre.trim().slice(0, 120) }
                : {}),
            }
          })
          .filter((x): x is ComboColorSeleccion => x != null)
      : undefined
    try {
      await validateCatalogLineStock(db, tenantId, { productId, cantidad: cant, varianteId, tallaId })
    } catch (e) {
      throw new HttpsError('failed-precondition', e instanceof Error ? e.message : 'Stock insuficiente.')
    }
    const pSnap = await db.doc(`mc_tenants/${tenantId}/productos/${productId}`).get()
    if (!pSnap.exists) throw new HttpsError('invalid-argument', 'Producto no disponible.')
    const p = pSnap.data() as {
      nombre?: string
      precioCop?: number
      precioCostoCop?: number
      tipoProducto?: string
      activo?: boolean
      enCatalogo?: boolean
      descuentoActivo?: boolean
      descuentoTipo?: 'porcentaje' | 'monto_fijo'
      descuentoValor?: number
    }
    if (p.activo !== true || p.enCatalogo !== true) {
      throw new HttpsError('invalid-argument', 'Un producto no está a la venta.')
    }
    const precio = Math.round(productoPrecioVentaFromData(p))
    if (precio < 1) throw new HttpsError('invalid-argument', 'Precio faltante en un producto.')
    lineasRes.push({
      productId,
      nombre: (p.nombre ?? 'Producto').slice(0, 200),
      cantidad: cant,
      precioUnitarioCop: precio,
      ...(varianteId ? { varianteId } : {}),
      ...(tallaId ? { tallaId } : {}),
      ...(p.tipoProducto === 'combo' ? { esCombo: true } : {}),
      ...(comboColorSeleccion?.length ? { comboColorSeleccion } : {}),
      ...(p.tipoProducto !== 'combo' && p.precioCostoCop != null && p.precioCostoCop >= 0
        ? { costoUnitarioCop: Math.round(p.precioCostoCop) }
        : {}),
    })
  }

  const lineasEnriched = await enrichLineasWithComboCost(db, tenantId, lineasRes)
  lineasRes.length = 0
  lineasRes.push(...lineasEnriched)

  const subtotalCop = lineasRes.reduce((s, l) => s + l.precioUnitarioCop * l.cantidad, 0)
  if (subtotalCop < 1) throw new HttpsError('invalid-argument', 'Subtotal inválido.')

  const totalPiezas = lineasRes.reduce((s, l) => {
    if (l.esCombo && l.componentesExpandidos?.length) {
      return s + l.componentesExpandidos.reduce((x, c) => x + c.cantidad, 0)
    }
    return s + l.cantidad
  }, 0)

  const envioResolution = await resolveCheckoutEnvioCop({
    tenant,
    platform: platformSettings,
    enviaToken: input.enviaToken,
    destinoDepartamento: envioDepartamento,
    destinoCiudad: envioCiudad,
    destinoDireccion: envioDireccion,
    destinoNombre: nombre,
    destinoTelefono: telefono,
    subtotalCop,
    totalPiezas,
  })
  const envioCop = envioResolution.envioCop

  const cuponIn = typeof input.cuponCodigo === 'string' ? input.cuponCodigo : ''
  const cuponV = cuponIn.trim() ? buscarCuponActivo(cuponIn, tenant.cuponesCatalogo) : null
  if (cuponIn.trim() && !cuponV) {
    throw new HttpsError('failed-precondition', 'Cupón no válido o inactivo.')
  }
  const descFinal = cuponV ? descuentoDesdeCupon(subtotalCop, cuponV) : 0
  const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
  if (totalFinal < 1_000) {
    throw new HttpsError('invalid-argument', 'Monto mínimo de cobro no alcanzado.')
  }
  if (totalFinal > 80_000_000) {
    throw new HttpsError('invalid-argument', 'Monto fuera de rango permitido.')
  }

  const now = Date.now()
  const viewToken = newViewToken()
  const orderRef = db.collection(`mc_tenants/${tenantId}/ordenes_catalogo`).doc()
  const orderId = orderRef.id
  const numeroReferencia = buildNumeroReferencia(orderId)

  const orderDoc: Record<string, unknown> = {
    createdAt: now,
    updatedAt: now,
    estado: 'esperando_pago',
    numeroReferencia,
    lineas: lineasRes,
    subtotalCop,
    envioCop,
    envioCotizacionFuente: envioResolution.fuente,
    descuentoCop: descFinal,
    totalCop: totalFinal,
    pagoSimulado: false,
    pagoOnePay: false,
    pagoAddi: false,
    ...input.paymentSeed,
    clienteNombre: nombre.slice(0, 200),
    clienteTelefono: telefono.slice(0, 50),
    clienteTipoDocumento: tipoDocRaw.slice(0, 12),
    clienteDocumentoNumero: numDocRaw.slice(0, 32),
    clienteEmail: email.slice(0, 120),
  }

  const nota = typeof input.nota === 'string' ? input.nota.trim() : ''
  if (nota) orderDoc.notaCliente = nota.slice(0, 2000)
  orderDoc.envioCiudad = envioCiudad.slice(0, 120)
  orderDoc.envioDepartamento = envioDepartamento.slice(0, 120)
  orderDoc.envioDireccion = envioDireccion.slice(0, 500)
  const eref = typeof input.envioReferencia === 'string' ? input.envioReferencia.trim() : ''
  if (eref) orderDoc.envioReferencia = eref.slice(0, 300)
  if (envioResolution.seleccionada) {
    orderDoc.envioCotizacionCarrier = envioResolution.seleccionada.carrier
    orderDoc.envioCotizacionServicio = envioResolution.seleccionada.service
    if (envioResolution.seleccionada.deliveryEstimate) {
      orderDoc.envioCotizacionEntrega = envioResolution.seleccionada.deliveryEstimate
    }
  }
  if (cuponV) orderDoc.cuponCodigo = normalizeCuponCodigo(cuponV.codigo)
  const carritoIniciadoId =
    typeof input.carritoIniciadoId === 'string' ? input.carritoIniciadoId.trim().slice(0, 128) : ''
  if (carritoIniciadoId) orderDoc.carritoIniciadoId = carritoIniciadoId

  const wishlistId = typeof input.wishlistId === 'string' ? input.wishlistId.trim().slice(0, 128) : ''
  const destinatarioNombre =
    typeof input.destinatarioNombre === 'string' ? input.destinatarioNombre.trim().slice(0, 80) : ''
  if (input.esRegalo === true && wishlistId) {
    orderDoc.esRegalo = true
    orderDoc.wishlistId = wishlistId
    if (destinatarioNombre) orderDoc.destinatarioNombre = destinatarioNombre
    const giftNote = destinatarioNombre ? `Regalo para ${destinatarioNombre}` : 'Regalo (lista de deseos)'
    const prevNota = typeof orderDoc.notaCliente === 'string' ? orderDoc.notaCliente : ''
    orderDoc.notaCliente = prevNota ? `${giftNote}. ${prevNota}`.slice(0, 2000) : giftNote
  }

  await orderRef.set(orderDoc)

  return {
    tenantId,
    slug,
    orderId,
    orderRef,
    viewToken,
    totalFinal,
    envioCop,
    subtotalCop,
    lineasRes,
    cliente: {
      nombre,
      telefono,
      email,
      tipoDocumento: tipoDocRaw.slice(0, 12),
      documentoNumero: numDocRaw.slice(0, 32),
    },
    envio: {
      ciudad: envioCiudad,
      departamento: envioDepartamento,
      direccion: envioDireccion,
      ...(eref ? { referencia: eref } : {}),
    },
    tenantNombreTienda: (tenant.nombreTienda ?? 'Catálogo').trim(),
    tenantLogoUrl: typeof tenant.storeLogoUrl === 'string' ? tenant.storeLogoUrl : undefined,
  }
}
