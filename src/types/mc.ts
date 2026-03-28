/** Producto SaaS: free (catálogo estándar) o expert (estilos y colores del catálogo). */
export type McBillingPlan = 'free' | 'expert'

/** Plantilla + colores: catálogo público y panel admin (solo plan expert; free usa estilo fijo en público). */
export type McCatalogThemePreset = 'ios' | 'morning' | 'minimal' | 'bold' | 'boutique'

export interface McCatalogThemeColors {
  accent?: string
  accentText?: string
  bg?: string
  surface?: string
  text?: string
  muted?: string
}

export interface McCatalogTheme {
  preset: McCatalogThemePreset
  colors?: McCatalogThemeColors
}

export interface McUser {
  uid: string
  email: string
  displayName: string
  tenantId: string
  isSuperAdmin: boolean
  createdAt: number
}

export interface McTenant {
  id: string
  ownerUid: string
  slug: string
  nombreTienda: string
  whatsappNumero: string
  mensajeIntro?: string
  /** Millis UTC: membresía activa si > now */
  subscriptionEndsAt: number
  createdAt: number
  /** Plan de producto: expert desbloquea temas y colores del catálogo. */
  billingPlan?: McBillingPlan
  /** Tema del catálogo (preset + colores; colores solo relevantes en expert). */
  catalogTheme?: McCatalogTheme
  /** Etiqueta comercial del plan (solo súper admin; no afecta reglas de negocio). */
  subscriptionPlan?: 'trial' | 'monthly' | 'yearly' | 'custom'
  /**
   * Indica cómo se calcula el segundo total en el inicio (suma de `totalCop` en pedidos).
   * `week` = lun–dom local; `fortnight` = quincena de calendario (1–15 o 16–fin de mes).
   */
  salesSummaryPeriod?: 'week' | 'fortnight'
}

export interface McProducto {
  id: string
  nombre: string
  precioCop: number
  stock: number
  imageUrl?: string
  activo: boolean
  enCatalogo: boolean
  orden: number
  createdAt: number
  updatedAt: number
}

export interface McPedido {
  id: string
  clienteHint?: string
  nota: string
  estado: 'nuevo' | 'en_proceso' | 'listo'
  totalCop?: number
  createdAt: number
}

/** Pedido generado desde el checkout del catálogo (pago simulado hasta integrar pasarela). */
export type McOrdenCatalogoEstado =
  | 'pagado'
  | 'en_preparacion'
  | 'listo_envio'
  | 'enviado'
  | 'entregado'
  | 'cancelado'

export interface McOrdenCatalogoLinea {
  productId: string
  nombre: string
  cantidad: number
  precioUnitarioCop: number
}

export interface McOrdenCatalogo {
  createdAt: number
  updatedAt: number
  estado: McOrdenCatalogoEstado
  lineas: McOrdenCatalogoLinea[]
  totalCop: number
  pagoSimulado: boolean
  clienteNombre?: string
  clienteTelefono?: string
  clienteEmail?: string
  notaCliente?: string
  trackingNumber?: string
  trackingImageUrl?: string
}

export interface McSlugDoc {
  tenantId: string
  active: boolean
  updatedAt: number
}
