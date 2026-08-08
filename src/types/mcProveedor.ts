/** Marketplace de proveedores Mi Catálogo (dropship local / Collective). */

import type {
  McProductoSku,
  McProductoTalla,
  McProductoTallaModo,
  McProductoVariante,
} from '@/types/mc'

export type McProveedorLeadTime = 24 | 48 | 72 | 96

export type McProveedorPoEstado =
  | 'nuevo'
  | 'aceptado'
  | 'despachado'
  | 'entregado'
  | 'rechazado'
  | 'cancelado'

export type McProveedorLiquidacionEstado = 'por_cobrar' | 'pagado'

/** Perfil de proveedor (`mc_proveedores/{id}`). */
export interface McProveedor {
  id: string
  ownerUid: string
  /** Tienda origen si el proveedor es también un tenant Mi Catálogo. */
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
  /** Cómo genera guías: propia / Envia / manual. */
  logisticaModo?: 'manual' | 'envia' | 'propia'
  bancoNombre?: string
  bancoTipoCuenta?: string
  bancoNumeroCuenta?: string
  bancoTitular?: string
  onboardingCompleto: boolean
  activo: boolean
  verificado?: boolean
  /** Visible en marketplace público entre tiendas. */
  publico: boolean
  bio?: string
  logoUrl?: string
  productosCount?: number
  pedidosPendientes?: number
  porCobrarCop?: number
  createdAt: number
  updatedAt: number
}

/**
 * Oferta de reventa del proveedor.
 * Proyección del producto canónico en `mc_tenants/{sourceTenantId}/productos/{sourceProductId}`.
 * Incluye snapshot de variantes para import sin leer el tenant origen.
 */
export interface McProveedorProducto {
  id: string
  proveedorId: string
  /** Tenant dueño del inventario canónico. */
  sourceTenantId?: string
  /** Producto canónico en la tienda del proveedor. */
  sourceProductId?: string
  nombre: string
  descripcion?: string
  referencia?: string
  imageUrl?: string
  galeriaImagenes?: string[]
  /** Costo que paga la tienda al proveedor (COP). */
  precioCostoCop: number
  /** Precio de venta sugerido al cliente final. */
  precioSugeridoCop?: number
  stock: number
  leadTimeHoras: McProveedorLeadTime
  pesoGramos?: number
  categoriaLabel?: string
  marketplaceVisible: boolean
  /** Solo tiendas invitadas / con vínculo. */
  privado?: boolean
  precioMinimoVentaCop?: number
  activo: boolean
  orden: number
  /** Snapshot catálogo (mismas formas que McProducto). */
  esRopa?: boolean
  tallaModo?: McProductoTallaModo
  imagenPrincipalColorId?: string
  variantes?: McProductoVariante[]
  tallas?: McProductoTalla[]
  skus?: McProductoSku[]
  tieneVariantes?: boolean
  createdAt: number
  updatedAt: number
}

/** Listing denormalizado para browse (`mc_marketplace_listings/{id}`). */
export interface McMarketplaceListing {
  id: string
  proveedorId: string
  proveedorProductoId: string
  sourceTenantId?: string
  sourceProductId?: string
  proveedorNombre: string
  proveedorCiudad?: string
  proveedorVerificado?: boolean
  nombre: string
  descripcion?: string
  imageUrl?: string
  precioCostoCop: number
  precioSugeridoCop?: number
  stock: number
  leadTimeHoras: McProveedorLeadTime
  categoriaLabel?: string
  precioMinimoVentaCop?: number
  tieneVariantes?: boolean
  visible: boolean
  updatedAt: number
  createdAt: number
}

export interface McProveedorPoLinea {
  proveedorProductoId: string
  storeProductId?: string
  nombre: string
  cantidad: number
  costoUnitarioCop: number
  precioVentaUnitarioCop?: number
  varianteId?: string
  tallaId?: string
  skuId?: string
}

/** Orden de compra tienda → proveedor. */
export interface McProveedorPo {
  id: string
  proveedorId: string
  proveedorNombre: string
  storeTenantId: string
  storeNombre: string
  storeOrdenId: string
  storeOrdenRef?: string
  estado: McProveedorPoEstado
  lineas: McProveedorPoLinea[]
  costoTotalCop: number
  clienteNombre?: string
  clienteTelefono?: string
  envioCiudad?: string
  envioDepartamento?: string
  envioDireccion?: string
  envioReferencia?: string
  trackingNumber?: string
  trackingImageUrl?: string
  notaProveedor?: string
  notaTienda?: string
  liquidacionEstado: McProveedorLiquidacionEstado
  liquidacionPagadoAt?: number
  /** Pedido origen con contraentrega. */
  pagoContraEntrega?: boolean
  /** Monto a recaudar del cliente (COP). */
  montoRecaudarCop?: number
  /** Recaudo COD en puerta del cliente. */
  recaudoEstado?: 'pendiente' | 'recaudado' | 'no_entregado' | 'devuelto'
  recaudadoAt?: number
  aceptadoAt?: number
  despachadoAt?: number
  entregadoAt?: number
  rechazadoAt?: number
  createdAt: number
  updatedAt: number
}

/** Vínculo tienda ↔ proveedor (`mc_tenants/{tid}/proveedor_links/{proveedorId}`). */
export interface McProveedorLink {
  id: string
  proveedorId: string
  proveedorNombre: string
  activo: boolean
  productosImportados: number
  createdAt: number
  updatedAt: number
}

export const MC_PROVEEDOR_LEAD_TIME_OPTIONS: {
  value: McProveedorLeadTime
  label: string
  hint: string
}[] = [
  { value: 24, label: '24 horas', hint: 'Despachás el mismo día o al día siguiente' },
  { value: 48, label: '48 horas', hint: '1 a 2 días hábiles para despachar' },
  { value: 72, label: '72 horas', hint: 'Hasta 3 días hábiles' },
  { value: 96, label: '96 horas', hint: 'Hasta 4 días hábiles' },
]
