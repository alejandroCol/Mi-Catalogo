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

export interface McEnvioCiudadPrecio {
  /**
   * Nombre oficial DIVIPOLA del departamento (mismo valor que en `COLOMBIA_DEPARTAMENTOS`).
   * Si viene vacío/u omitido en datos viejos, el checkout igualó solo por ciudad.
   */
  departamento?: string
  /** Ej. Cali, Medellín (se normaliza al comparar). */
  ciudad: string
  /** Costo en COP para esa ciudad. */
  cop: number
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
  /** Costo fijo estimado de envío en checkout (COP). 0 o ausente = no se suma envío al total. */
  envioEstimadoCop?: number
  /** Texto visible en el checkout, ej. "Envío estimado (nacional)". */
  envioEstimadoEtiqueta?: string
  /** Tarifas por ciudad; si la ciudad del cliente no está en la lista, se usa `envioEstimadoCop`. */
  envioPorCiudad?: McEnvioCiudadPrecio[]
  /**
   * Si es true y hay datos en la plataforma (`mc_platform/settings`), el checkout usa las tarifas
   * cargadas por súper admin en lugar de `envioEstimadoCop` / `envioPorCiudad` de la tienda.
   */
  envioUsarTarifasMicatalogo?: boolean
  /** Subtotal mínimo (solo productos, sin cupón) para envío gratis en checkout. */
  envioGratisDesdeCop?: number
  /** Cupones de descuento para el checkout del catálogo. */
  cuponesCatalogo?: McCuponTienda[]
  /** Textos del catálogo público: página Políticas (envíos, pagos, cambios). */
  politicasEnvios?: string
  politicasPagos?: string
  politicasCambios?: string
  /**
   * Pago real vía OnePay (Cloud Function + clave en subcolección privada).
   * No guardes la clave API en este documento.
   */
  onepayPaymentsEnabled?: boolean
  /** Millis UTC de la última vinculación OnePay (solo metadato). */
  onepayLinkedAt?: number
  /** Últimos caracteres de la clave guardada (solo visualización). */
  onepayKeyHint?: string
  /**
   * Token de ruta para el webhook (query `?k=`). No es el secreto HMAC: solo enrutamiento.
   * Claves en `private_onepay/credentials`: `secretKey` (sk_), `webhookSecret` (whsec_),
   * `webhookToken` (wh_hdr_ / x-webhook-token), `publicKey` (pk_, opcional).
   */
  onpayWebHookK?: string
  /** Últimos caracteres del secreto HMAC del webhook (whsec_…). */
  onepayWebhookHint?: string
  /** Últimos caracteres del token de cabecera (wh_hdr_… → x-webhook-token). */
  onepayWebhookTokenHint?: string
  /** Últimos caracteres de la clave pública API (pk_test_… / pk_live_…). */
  onepayPublicKeyHint?: string
  /**
   * Preferencia del vendedor para el checkout: cobro con OnePay o venta coordinada sin pasarela (WhatsApp).
   * Debe setearse explícitamente en Cuenta; si falta, el checkout público y «Ver catálogo» quedan bloqueados.
   * `pasarela_micatalogo` usa la cuenta OnePay de Mi Catálogo (sin KYB/comercio propio).
   */
  checkoutVentasModo?: 'pasarela' | 'whatsapp' | 'pasarela_micatalogo'
  /**
   * Alta de empresa OnePay (KYB) vía API de plataforma: revisión antes de cobrar en catálogo.
   * `approved` + claves API (panel súper admin) habilitan pagos reales (junto al webhook).
   */
  onepayKybStatus?: 'pending' | 'approved' | 'rejected'
  /** ID devuelto por POST /v1/companies. */
  onepayCompanyId?: string
  onepayKybSubmittedAt?: number
  onepayKybTermsAcceptedAt?: number
  onepayKybTermsVersion?: string
}

/** Cupón configurable desde Cuenta · checkout catálogo. */
export interface McCuponTienda {
  id: string
  codigo: string
  tipo: 'porcentaje' | 'monto_fijo'
  /** Porcentaje 0–100 o monto fijo en COP según `tipo`. */
  valor: number
  activo: boolean
}

/** Variante (ej. color). Precio e imagen opcionales; si no van, usan los del producto base. */
export interface McProductoVariante {
  id: string
  nombre: string
  /** Color para UI (swatch), ej. #c41e3a */
  hex?: string
  /** Si se define, sustituye al precio base del producto para esta variante. */
  precioCop?: number
  /** Foto propia de la variante (opcional). */
  imageUrl?: string
}

export interface McProducto {
  id: string
  nombre: string
  precioCop: number
  stock: number
  imageUrl?: string
  /** Fotos extra de galería (la principal sigue siendo `imageUrl`). */
  galeriaImagenes?: string[]
  /** Variantes (colores, etc.). Si hay al menos una, el cliente elige antes de comprar. */
  variantes?: McProductoVariante[]
  activo: boolean
  enCatalogo: boolean
  orden: number
  createdAt: number
  updatedAt: number
  /** Si es true, el producto sigue mostrando badge/sección Novedades aunque pase el umbral por fecha. */
  marcarNovedad?: boolean
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
  | 'esperando_pago'
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
  /** Total cobrado: subtotal − descuento + envío. */
  totalCop: number
  pagoSimulado: boolean
  /** Pago con OnePay (catálogo) confirmado vía webhook. */
  pagoOnePay?: boolean
  onepayViewToken?: string
  onepayPaymentId?: string | null
  /** Cobro con credenciales de la plataforma (checkout sin cuenta OnePay del comercio). */
  onepayViaMicatalogo?: boolean
  /** Id de tienda Firestore; también se envía a OnePay como `mi_catalogo_store_id` en metadata. */
  micatalogoStoreId?: string
  clienteNombre?: string
  clienteTelefono?: string
  clienteEmail?: string
  /** Tipo de documento del comprador (checkout Colombia). */
  clienteTipoDocumento?: string
  /** Número de documento del comprador. */
  clienteDocumentoNumero?: string
  notaCliente?: string
  trackingNumber?: string
  trackingImageUrl?: string
  /** Código corto para seguimiento público (ej. MC-A1B2C3D4). */
  numeroReferencia?: string
  /** Código que el comprador ingresa para ver estado y guía (ej. SG-AB12-CD34). */
  seguimientoCompraAt?: number
  seguimientoPreparacionAt?: number
  seguimientoDespachoAt?: number
  seguimientoEntregaAt?: number
  /** Suma de líneas (antes de envío y cupón). */
  subtotalCop?: number
  envioCop?: number
  descuentoCop?: number
  cuponCodigo?: string
  envioCiudad?: string
  envioDireccion?: string
  envioReferencia?: string
  envioDepartamento?: string
}

/** Documento `mc_platform/settings` (sin secretos). */
export interface McPlatformSettings {
  pasarelaMicatalogoActiva?: boolean
  onpayWebHookK?: string
  onepayKeyHint?: string
  onepayWebhookHint?: string
  onepayWebhookTokenHint?: string
  onepayPublicKeyHint?: string
  updatedAt?: number
  /** Envío por defecto en COP para tiendas que usan tarifas plataforma (sin ciudad en tabla). */
  envioMicatalogoEstimadoCop?: number
  /** Tarifas por ciudad definidas por súper admin (ej. importación Excel). */
  envioMicatalogoPorCiudad?: McEnvioCiudadPrecio[]
  /** Millis UTC de la última actualización de tarifas plataforma. */
  envioMicatalogoUpdatedAt?: number
}

export interface McSlugDoc {
  tenantId: string
  active: boolean
  updatedAt: number
}
