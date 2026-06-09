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

/** Familias tipográficas elegibles para personalizar la tienda. */
export type McCatalogFontId = 'inter-tight' | 'playfair' | 'fredoka' | 'quicksand' | 'dm-serif'

/** `store`: catálogo completo; `banner`: solo título y descripción del banner principal. */
export type McCatalogFontScope = 'store' | 'banner'

export interface McCatalogThemeFonts {
  family: McCatalogFontId
  scope?: McCatalogFontScope
}

export interface McCatalogTheme {
  preset: McCatalogThemePreset
  colors?: McCatalogThemeColors
  fonts?: McCatalogThemeFonts
}

/** Tipo de fondo del banner de temporada. */
export type McSeasonBannerMediaType = 'image' | 'video'

/** Anuncio editorial fullscreen en el catálogo público (plan Expert). */
export interface McSeasonBanner {
  enabled: boolean
  /** Etiqueta superior, ej. «Nueva temporada». */
  eyebrow?: string
  headline?: string
  subheadline?: string
  /** Texto del botón principal al cerrar el splash. */
  ctaLabel?: string
  /** Fondo estático (JPEG en Storage). */
  imageUrl?: string
  /** Fondo en video (MP4 optimizado en Storage). */
  videoUrl?: string
  /** Miniatura del video (JPEG) para carga rápida y `poster` del reproductor. */
  posterUrl?: string
  /** Por defecto `image` si hay `imageUrl` sin `videoUrl`. */
  mediaType?: McSeasonBannerMediaType
  /** Cambia al guardar; invalida cierre en sessionStorage del visitante. */
  updatedAt?: number
}

/** Dueño de tienda (default) o representante comercial de campo. */
export type McUserRole = 'owner' | 'sales_rep'

/** Resultado de una visita presencial registrada por un vendedor. */
export type McSalesVisitOutcome = 'venta_exitosa' | 'pendiente' | 'rechazo'

export interface McUser {
  uid: string
  email: string
  displayName: string
  tenantId: string
  isSuperAdmin: boolean
  /** Ausente en usuarios legacy → se trata como `owner`. */
  role?: McUserRole
  createdAt: number
  /** Solo vendedores: desactivar acceso sin borrar historial. */
  active?: boolean
}

/** Visita presencial a una marca (`mc_sales_visits`). */
export interface McSalesVisit {
  id: string
  salesRepUid: string
  salesRepName: string
  storeName: string
  /** Dirección física, barrio, referencia u otro detalle de la tienda visitada. */
  storeDetail?: string
  /** Tienda real en la plataforma, si el vendedor la asoció al registrar. */
  tenantId?: string
  tenantSlug?: string
  outcome: McSalesVisitOutcome
  rejectionReason?: string
  /** YYYY-MM-DD (zona local del vendedor al registrar). */
  dateKey: string
  createdAt: number
}

/** Tienda demo seleccionable por vendedores (`mc_demo_stores`). */
export interface McDemoStore {
  id: string
  tenantId: string
  /** Slug público de la tienda (para abrir catálogo). */
  slug: string
  displayName: string
  description?: string
  active: boolean
  order: number
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
  /** Millis UTC del último cambio de dominio (slug); cooldown 6 meses entre cambios. */
  storeSlugChangedAtMs?: number
  whatsappNumero: string
  mensajeIntro?: string
  /** Millis UTC: vencimiento Expert; plan Free no usa este campo. */
  subscriptionEndsAt?: number
  createdAt: number
  /** Plan de producto: expert desbloquea publicar la tienda online. */
  billingPlan?: McBillingPlan
  /** Catálogo visible para clientes en URL pública (requiere Expert activo en tiendas nuevas). */
  catalogPublished?: boolean
  /** Millis UTC del primer publish exitoso. */
  catalogPublishedAt?: number
  /**
   * Tiendas existentes antes del modelo publish: permanecen públicas sin Expert.
   * Seteado por backfill o súper admin.
   */
  catalogPublishGrandfathered?: boolean
  /** Tema del catálogo (preset + colores; colores solo relevantes en expert). */
  catalogTheme?: McCatalogTheme
  /** Logo de tienda (solo plan Expert). URL pública en Storage. */
  storeLogoUrl?: string
  /** Banner fullscreen opcional al entrar al catálogo (solo Expert). */
  seasonBanner?: McSeasonBanner
  /** Contador de productos en inventario; se mantiene al crear/eliminar. */
  productCount?: number
  /** Etiqueta comercial del plan (solo súper admin; no afecta reglas de negocio). */
  subscriptionPlan?: 'trial' | 'monthly' | 'yearly' | 'custom'
  /** Suscripción Expert vía OnePay plataforma (subscription_v2). */
  billingSubStatus?: 'none' | 'active' | 'past_due' | 'canceled'
  /** Si el cobro falló: mantiene Expert hasta esta fecha (gracia 7 días). */
  billingGraceUntilMs?: number
  billingPastDueSinceMs?: number
  billingOnePayCustomerId?: string
  billingPinnedCardId?: string
  billingPinnedAccountId?: string
  billingDebitMethod?: 'card' | 'nequi'
  /** false = no renovar al vencer; el plan sigue hasta subscriptionEndsAt. */
  billingAutoRenewEnabled?: boolean
  billingPayerFirstName?: string
  billingPayerLastName?: string
  billingPayerDocumentType?: string
  billingPayerDocumentNumber?: string
  billingPayerPhone?: string
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
  /** Cotización en vivo vía Envia.com (Modelo A — cuenta plataforma). */
  envioCotizarAutomatico?: boolean
  /** Origen del despacho (requerido si `envioCotizarAutomatico`). */
  envioOrigenDepartamento?: string
  envioOrigenCiudad?: string
  envioOrigenDireccion?: string
  envioOrigenTelefono?: string
  /** Empaque default para cotizar cuando el producto no tiene medidas propias. */
  envioEmpaquePesoKg?: number
  envioEmpaqueLargoCm?: number
  envioEmpaqueAnchoCm?: number
  envioEmpaqueAltoCm?: number
  /**
   * Código Envia: `coordinadora`, `servientrega` o `deprisa`.
   * Vacío/ausente = en checkout se muestra la tarifa más barata.
   */
  envioTransportadoraFavorita?: string
  /** Cupones de descuento para el checkout del catálogo. */
  cuponesCatalogo?: McCuponTienda[]
  /** Tab de ofertas en el listado público del catálogo. */
  catalogDescuentosTab?: McCatalogDescuentosTab
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
  /**
   * Periodicidad deseada de llegada de fondos (solo registro interno / súper admin; no se envía a OnePay).
   */
  onepayFundWithdrawalPeriod?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  /** Cliente OnePay (plataforma) para retiros con pasarela sin registro. */
  onepayPayoutCustomerId?: string
  /** Cuenta bancaria OnePay vinculada al cliente para dispersión. */
  onepayPayoutAccountId?: string
  /** Últimos dígitos de la cuenta (solo visualización). */
  onepayPayoutAccountHint?: string
  onepayPayoutSetupAt?: number
  /** Millis UTC: checklist de tienda nueva completado (oculta banner y checklist). */
  onboardingSetupCompletedAt?: number
  /** Millis UTC: el dueño ya vio el CTA «listo para vender» en Inicio (no volver a mostrar). */
  onboardingSharePromptSeenAt?: number
  /** Código Expert exclusivo emitido al completar la tienda (solo este tenant). */
  onboardingExpertRewardCode?: string
  onboardingExpertRewardCodeId?: string
  /** Aceptación de T&C de la plataforma al registrarse. */
  platformTermsAcceptedAt?: number
  platformTermsVersion?: string
  platformTermsAcceptedByUid?: string
  platformTermsAcceptedByEmail?: string
  /** Huella FNV-1a del texto de términos aceptado. */
  platformTermsContentHash?: string
  /** User-Agent del navegador al aceptar (registro de auditoría). */
  platformTermsUserAgent?: string
}

/** Registro inmutable de aceptación legal (`mc_tenants/{tid}/legal_acceptances/{version}`). */
export interface McLegalAcceptance {
  acceptedAt: number
  termsVersion: string
  termsContentHash: string
  acceptedByUid: string
  acceptedByEmail: string
  userAgent?: string
  context: 'registration'
}

/** Tab opcional en el catálogo público con productos en oferta. */
export interface McCatalogDescuentosTab {
  enabled: boolean
  /** Etiqueta visible en el tab; si vacía → «Descuento». */
  label?: string
}

/** Cupón configurable desde Cuenta · checkout catálogo. */
export interface McCuponTienda {
  id: string
  codigo: string
  tipo: 'porcentaje' | 'monto_fijo'
  /** Porcentaje 0–100 o monto fijo en COP según `tipo`. */
  valor: number
  activo: boolean
  /** Cupón generado para recuperar un carrito abandonado (función Expert). */
  esRecuperacion?: boolean
  /** Vincula el cupón al carrito iniciado que se intenta recuperar. */
  carritoIniciadoId?: string
}

/** Línea persistida de un carrito iniciado (checkout sin completar). */
export interface McCarritoIniciadoLinea {
  productId: string
  varianteId?: string
  tallaId?: string
  titulo: string
  subtitulo?: string
  precioUnitarioCop?: number
  cantidad: number
}

export type McCarritoIniciadoEstado = 'activo' | 'comprado' | 'recuperado'

/** Carrito guardado al iniciar checkout (recuperación Expert). */
export interface McCarritoIniciado {
  createdAt: number
  updatedAt: number
  estado: McCarritoIniciadoEstado
  lineas: McCarritoIniciadoLinea[]
  subtotalCop: number
  /** Token anónimo del navegador; permite actualizar sin auth. */
  sessionToken: string
  clienteNombre?: string
  clienteTelefono?: string
  clienteEmail?: string
  envioCiudad?: string
  envioDepartamento?: string
  envioDireccion?: string
  /** Código de cupón enviado en recordatorio (si aplica). */
  cuponCodigo?: string
  descuentoPorcentaje?: number
  recordatorioEnviadoAt?: number
  ordenId?: string
  recuperadoAt?: number
}

/** Talla de prenda con stock propio (independiente de variantes de color/tela). */
export interface McProductoTalla {
  id: string
  /** Etiqueta visible: «XS», «M», «Talla única», etc. */
  nombre: string
  stock: number
}

/** Variante vendible (color, olor, capacidad, tela, etc.). Precio, imagen y stock opcionales. */
export interface McProductoVariante {
  id: string
  /** Etiqueta visible: «Lavanda», «256 GB», «Negro / M», etc. */
  nombre: string
  /** Categoría de la opción para agrupar en catálogo: «Color», «Olor», «Capacidad»… */
  tipo?: string
  /** Muestra de color en UI (swatch), ej. #c41e3a — opcional. */
  hex?: string
  /** Unidades disponibles de esta variante. Si hay variantes con stock, el del producto suele ser la suma. */
  stock?: number
  /** Si se define, sustituye al precio base del producto para esta variante. */
  precioCop?: number
  /** Foto propia de la variante (opcional). */
  imageUrl?: string
}

/** Categoría de productos visible en el sidebar del catálogo público. */
export interface McCategoria {
  id: string
  nombre: string
  /** Orden de aparición entre hermanos (menor = primero). */
  orden: number
  activa: boolean
  /** Ausente o null = categoría raíz; id del padre = subcategoría (máx. 2 niveles). */
  parentId?: string | null
  createdAt: number
  updatedAt: number
}

export interface McProducto {
  id: string
  nombre: string
  /** Texto libre visible en la ficha pública del producto. */
  descripcion?: string
  precioCop: number
  stock: number
  imageUrl?: string
  /** Fotos extra de galería (la principal sigue siendo `imageUrl`). */
  galeriaImagenes?: string[]
  /** Variantes (colores, telas, etc.). Si hay al menos una, el cliente elige antes de comprar. */
  variantes?: McProductoVariante[]
  /** Prenda de vestir: stock por talla y variantes limitadas a color/tela. */
  esRopa?: boolean
  /** Curva de tallas con stock individual (solo si `esRopa`). */
  tallas?: McProductoTalla[]
  activo: boolean
  enCatalogo: boolean
  /** Producto incompleto guardado automáticamente al crear; no visible en catálogo hasta publicar. */
  esBorrador?: boolean
  orden: number
  createdAt: number
  updatedAt: number
  /** Si es true, el producto sigue mostrando badge/sección Novedades aunque pase el umbral por fecha. */
  marcarNovedad?: boolean
  /** Muestra el botón «Descargar imagen» en el catálogo (útil para mayoristas). */
  mostrarDescargaImagen?: boolean
  /** Muestra el botón «Añadir 1 docena» en la ficha pública del producto. */
  mostrarBotonDocena?: boolean
  /** Descuento visible en catálogo (sobre precio base o variante). */
  descuentoActivo?: boolean
  descuentoTipo?: 'porcentaje' | 'monto_fijo'
  /** Porcentaje 0–100 o monto fijo en COP según `descuentoTipo`. */
  descuentoValor?: number
  /** IDs de categorías asociadas (`mc_tenants/{tid}/categorias`). */
  categoriaIds?: string[]
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
  /** Transportadora elegida al cotizar (Envia.com). */
  envioCotizacionCarrier?: string
  envioCotizacionServicio?: string
  envioCotizacionEntrega?: string
  /** `envia` = tarifa en vivo; `estatico` = tabla/fallback. */
  envioCotizacionFuente?: 'envia' | 'estatico'
  descuentoCop?: number
  cuponCodigo?: string
  /** Carrito abandonado vinculado (recuperación Expert). */
  carritoIniciadoId?: string
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
  /** Máximo de productos en inventario para plan Free (default 20). */
  planFreeMaxProductos?: number
  /** Máximo de productos en inventario para plan Expert. */
  planExpertMaxProductos?: number
  /** Precio mensual del plan Expert en COP (checkout simulado). */
  planExpertPrecioMensualCop?: number
  /** Precio anual del plan Expert en COP (checkout simulado). */
  planExpertPrecioAnualCop?: number
  /** Nombre comercial del plan Expert (UI «Eres …»). */
  planExpertDisplayName?: string
  /** Ruta FTCaptures / OnePay Elements para tarjetas in-app. */
  onepayCaptureRouteId?: string
  /** Correo que recibe aviso cuando se registra una tienda nueva. */
  newStoreNotifyEmail?: string
  /** Versión vigente de T&C para registro de tiendas (ej. `2026-05-23`). */
  platformTermsVersion?: string
  /** Texto completo editable de T&C plataforma → comerciante. */
  platformTermsText?: string
  /** Millis UTC de última publicación de T&C. */
  platformTermsUpdatedAt?: number
  /**
   * Banner de promo Expert 24 h en el dashboard para tiendas nuevas.
   * El checklist de onboarding se muestra igual aunque esté desactivado.
   * Default: activado (undefined = true).
   */
  newStoreExpertPromoBannerEnabled?: boolean
  /** Slug de la tienda demo enlazada desde la landing («Ver tienda demo»). */
  landingDemoSlug?: string
  /** Nombre de la tienda para mostrar en el selector de súper admin (cache UI). */
  landingDemoDisplayName?: string
}

/** Métricas diarias del catálogo público (`mc_tenants/{tid}/analytics_daily/{YYYY-MM-DD}`). */
export interface McAnalyticsDaily {
  dateKey: string
  /** Visitantes únicos aproximados (1 sesión por día). */
  visits: number
  pageViews: number
  productViews: number
  checkoutStarts: number
  checkoutCompletes: number
  updatedAt?: number
}

export type McAnalyticsPeriod = '7d' | '14d' | '30d'

export type McAnalyticsSummary = {
  visits: number
  pageViews: number
  productViews: number
  checkoutStarts: number
  checkoutCompletes: number
  daily: McAnalyticsDaily[]
}

/** Vistas agregadas por producto (`mc_tenants/{tid}/analytics_products/{productId}`). */
export interface McAnalyticsProduct {
  productId: string
  productTitle: string
  imageUrl?: string
  viewsTotal: number
  lastViewedAt?: number
}

/** Vistas diarias por producto (`mc_tenants/{tid}/analytics_product_daily/{dateKey}__{productId}`). */
export interface McAnalyticsProductDaily {
  dateKey: string
  productId: string
  productTitle: string
  imageUrl?: string
  views: number
  updatedAt?: number
}

export type McTopProductRow = {
  productId: string
  productTitle: string
  imageUrl?: string
  views: number
  sharePercent: number
}

/** Código de descuento SaaS (`mc_billing_discount_codes`). */
export interface McBillingDiscountCode {
  id?: string
  code: string
  codeNormalized: string
  active: boolean
  /** Precio final COP (0 = primer período gratis con `freeMonths` o `freeTrialDays`). */
  priceCop: number
  billingPeriod?: 'monthly' | 'yearly'
  /** Meses gratis al activar (1–3); requiere método de pago y cobra precio normal después. */
  freeMonths?: number
  freeTrialDays?: number
  /** Solo este tenant puede canjear el código. */
  restrictedTenantId?: string
  /** Si true (default con freeMonths), exige tarjeta/Nequi aunque el cobro inicial sea $0. */
  requiresPaymentMethod?: boolean
  maxRedemptions?: number
  redemptionCount?: number
  validFromMs?: number
  validUntilMs?: number
  label?: string
  updatedAt?: number
}

export interface McSlugDoc {
  tenantId: string
  active: boolean
  updatedAt: number
}
