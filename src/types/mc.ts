/** Producto SaaS: free, expert (catálogo premium) o master (expert + live shopping). */
export type McBillingPlan = 'free' | 'expert' | 'master'

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

/**
 * Dónde aplicar la tipografía personalizada:
 * - `store`: catálogo completo (incluye barra de anuncio)
 * - `banner`: solo título y descripción del hero de temporada
 * - `announcement`: solo la barra de anuncio (marquee superior)
 */
export type McCatalogFontScope = 'store' | 'banner' | 'announcement'

export interface McCatalogThemeFonts {
  family: McCatalogFontId
  scope?: McCatalogFontScope
}

/** Forma de botones de acción del catálogo público. */
export type McCatalogButtonShape = 'pill' | 'square'

export interface McCatalogTheme {
  preset: McCatalogThemePreset
  colors?: McCatalogThemeColors
  fonts?: McCatalogThemeFonts
  /** `pill` = redondos (default); `square` = esquinas cuadradas suaves. */
  buttonShape?: McCatalogButtonShape
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

/** Atmósfera visual del pasillo / showroom (solo plan Master). */
export type McShowroomMood = 'midnight' | 'atelier' | 'runway' | 'gallery'

/** Organización del texto en el banner de entrada del showroom (home). */
export type McShowroomHomeLayout = 'editorial' | 'center' | 'panel' | 'bottom'

/**
 * Drop Room + Pasillo / Showroom inmersivo para presentar una colección.
 * Solo plan Master con suscripción activa.
 */
export interface McCollectionShowroom {
  enabled: boolean
  /**
   * Apertura del drop (UTC ms). Si es futuro → sala cerrada con countdown.
   * Ausente o pasado → pasillo abierto.
   */
  dropAtMs?: number
  teaserEyebrow?: string
  teaserHeadline?: string
  teaserSubheadline?: string
  /** CTA en drop cerrado («Avisame») o puerta abierta («Entrar al pasillo»). */
  teaserCtaLabel?: string
  teaserImageUrl?: string
  teaserVideoUrl?: string
  teaserPosterUrl?: string
  teaserMediaType?: McSeasonBannerMediaType
  collectionTitle?: string
  collectionSubtitle?: string
  /** Banner de entrada en el home del catálogo. */
  homeEyebrow?: string
  homeHeadline?: string
  homeSubheadline?: string
  homeCtaLabel?: string
  /** Estilo del banner en home (texto + forma). Por defecto `editorial`. */
  homeLayout?: McShowroomHomeLayout
  /** Fuente del título del banner en home. */
  homeFontId?: McCatalogFontId
  /**
   * Ancho completo de borde a borde (rompe el padding del catálogo).
   * Por defecto `true`.
   */
  homeFullWidth?: boolean
  mood?: McShowroomMood
  /** Productos del pasillo, en orden de recorrido. */
  productIds?: string[]
  atelierHeadline?: string
  atelierSubheadline?: string
  /** Look final del atelier (subconjunto o selección aparte). */
  atelierProductIds?: string[]
  /** Mostrar «Quedan N» en displays del pasillo. */
  showStockLeft?: boolean
  /** Lista de espera en Drop Room (email vía Cloud Function). */
  waitlistEnabled?: boolean
  updatedAtMs?: number
}

/** Entrada a la lista de espera del Drop Room (`showroom_waitlist`). */
export interface McShowroomWaitlistEntry {
  id: string
  email: string
  name?: string
  createdAt: number
  userAgent?: string
}

/** Dueño de tienda (default), representante comercial de campo o cajero POS. */
export type McUserRole = 'owner' | 'sales_rep' | 'pos_vendor'

/** Resultado de una visita presencial registrada por un vendedor. */
export type McSalesVisitOutcome = 'venta_exitosa' | 'pendiente' | 'rechazo'

/** Seguimiento agregado a una visita por el vendedor. */
export interface McSalesVisitUpdate {
  id: string
  description: string
  outcome: McSalesVisitOutcome
  createdAt: number
}

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
  /** Solo vendedores POS: sede asignada. */
  posSedeId?: string
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
  updatedAt?: number
  updates?: McSalesVisitUpdate[]
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
  /**
   * Drop Room + Pasillo / Showroom de colección (solo plan Master).
   * Experiencia inmersiva aparte del grid del catálogo.
   */
  collectionShowroom?: McCollectionShowroom
  /** Contador de productos en inventario; se mantiene al crear/eliminar. */
  productCount?: number
  /** Perfil proveedor marketplace (`mc_proveedores/{id}`). */
  proveedorId?: string
  /** La tienda también opera como proveedor del marketplace. */
  esProveedorActivo?: boolean
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
  /**
   * Si true, las categorías del catálogo se muestran como círculo + nombre
   * (usa `McCategoria.imageUrl` cuando exista).
   */
  mostrarCategoriasConImagenes?: boolean
  /** Mini barra promocional opcional arriba del header del catálogo. */
  announcementBar?: McAnnouncementBar
  /**
   * Disposición de la cabecera del catálogo público.
   * Ausente o inválido → `brand-left` (logo a la izquierda).
   */
  headerLayout?: McCatalogHeaderLayoutId
  /** Sección «Sobre mi marca» opcional al pie del catálogo. */
  storeAbout?: McStoreAbout
  /** Redes sociales opcionales en el pie del catálogo. */
  storeSocialFooter?: McStoreSocialFooter
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
   * Si true, el checkout ofrece «Pagar al recibir» (contraentrega / COD).
   * Útil con dropship: el cliente paga al mensajero; el recaudo se concilia después.
   */
  contraentregaCatalogoEnabled?: boolean
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
  /**
   * Pago a cuotas con Addi (BYOK). Solo plan Master.
   * Secretos en `private_addi/credentials` (clientId, clientSecret, allySlug, callback*).
   */
  addiPaymentsEnabled?: boolean
  addiLinkedAt?: number
  /** Token de ruta webhook Addi (`?k=`). */
  addiWebHookK?: string
  addiClientIdHint?: string
  addiAllySlug?: string
  addiSandbox?: boolean
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
  /** Sede central de inventario (bodega) para POS. */
  posSedeBodegaId?: string
  /** URL pública del instalador ZIP del puente POS (opcional). */
  posBridgeInstallerUrl?: string
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

/** Fondo de la barra de anuncio; el texto se invierte automáticamente. */
export type McAnnouncementBarTheme = 'black' | 'white'

/** Separación horizontal entre mensajes del marquee. */
export type McAnnouncementBarSpacing = 'near' | 'normal' | 'far'

/**
 * Mini banner / barra de anuncio arriba del header del catálogo público.
 * Extensible: futuros campos (linkUrl, speed) sin romper el contrato actual.
 */
export interface McAnnouncementBar {
  enabled: boolean
  /**
   * Hasta 2 mensajes que se alternan en el marquee.
   * Si falta, se usa `text` (legado).
   */
  texts?: string[]
  /** @deprecated Preferir `texts`. Se mantiene para tiendas ya configuradas. */
  text?: string
  /** Fondo negro o blanco; default `black`. */
  theme?: McAnnouncementBarTheme
  /** Distancia entre textos; default `normal`. */
  spacing?: McAnnouncementBarSpacing
}

/**
 * Layout de la cabecera del catálogo.
 * - `brand-left`: logo/nombre a la izquierda (actual).
 * - `logo-center`: secciones a la izquierda, marca al centro, iconos a la derecha.
 */
export type McCatalogHeaderLayoutId = 'brand-left' | 'logo-center'

/** Sección «Sobre mi marca» al pie del catálogo público. */
export interface McStoreAbout {
  enabled: boolean
  /** Título principal; si vacío → «Sobre nosotros». */
  title?: string
  /** Texto principal (historia, materiales, durabilidad, etc.). */
  body?: string
  /** Título del bloque secundario opcional (ej. cuidados del producto). */
  extraTitle?: string
  /** Texto del bloque secundario opcional. */
  extraBody?: string
}

/** Redes sociales en el pie del catálogo público. */
export interface McStoreSocialFooter {
  enabled: boolean
  /** Mostrar WhatsApp usando `whatsappNumero` de la tienda. */
  whatsapp?: boolean
  instagramUrl?: string
  facebookUrl?: string
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
  /** Snapshot de `McProducto.referencia` al armar el carrito. */
  referencia?: string
  subtitulo?: string
  precioUnitarioCop?: number
  cantidad: number
  esCombo?: boolean
  comboColorSeleccion?: McComboColorSeleccion[]
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

export type McProductoTipo = 'simple' | 'combo'

/** Ítem fijo incluido en un combo (referencia a producto del inventario). */
export interface McComboComponente {
  productId: string
  /** Unidades de este componente por cada combo vendido. */
  cantidad: number
  varianteId?: string
  tallaId?: string
  /** Si true, el cliente elige color/tela al comprar (solo con `comboPermiteElegirColor`). */
  permiteElegirColor?: boolean
  /** Si true, el cliente elige talla al comprar (solo con `comboPermiteElegirTalla`). */
  permiteElegirTalla?: boolean
  /** Snapshot para UI al armar el combo. */
  nombreSnapshot?: string
  imageUrlSnapshot?: string
}

/** Color elegido por el cliente para una unidad dentro del combo. */
export interface McComboColorSeleccion {
  /** Índice en `comboComponentes`. */
  componenteIndex: number
  /** 0 … cantidad−1 dentro de un combo vendido. */
  slotIndex: number
  varianteId?: string
  varianteNombre?: string
  tallaId?: string
  tallaNombre?: string
}

/** Detalle de componente expandido al vender (auditoría / devoluciones). */
export interface McComboComponenteExpandido {
  productId: string
  varianteId?: string
  tallaId?: string
  cantidad: number
  costoUnitarioCop?: number
  nombre?: string
  varianteNombre?: string
  tallaNombre?: string
}

/** Talla de prenda con stock propio (independiente de variantes de color/tela). */
export type McProductoTallaModo = 'ropa' | 'zapatos'

/** Talla de prenda con stock propio (independiente de variantes de color/tela). */
export interface McProductoTalla {
  id: string
  /** Etiqueta visible: «XS», «M», «Talla única», etc. */
  nombre: string
  stock: number
}

/**
 * Intersección color × talla con stock propio (solo `esRopa` con variantes de color).
 * Cuando existe, el inventario se resuelve por SKU y no por talla global.
 */
export interface McProductoSku {
  id: string
  varianteId: string
  tallaId: string
  stock: number
  precioCop?: number
  precioCostoCop?: number
  codigoBarras?: string
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
  /** Costo de adquisición por unidad (opcional; para calcular margen). */
  precioCostoCop?: number
  /** Foto propia de la variante (opcional). */
  imageUrl?: string
  /** Fotos extra de la variante (p. ej. más ángulos del mismo color). */
  galeriaImagenes?: string[]
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
  /** Foto opcional (círculo en el catálogo cuando `mostrarCategoriasConImagenes`). */
  imageUrl?: string
  createdAt: number
  updatedAt: number
}

export interface McProducto {
  id: string
  nombre: string
  /**
   * Referencia interna del producto: nombre de la prenda + número secuencial
   * (ej. "Camisa 12"). Se muestra al crear y se envía en pedidos por WhatsApp.
   */
  referencia?: string
  /** `combo` = producto empaquetado con componentes del inventario; default `simple`. */
  tipoProducto?: McProductoTipo
  /** Componentes fijos del combo (solo si `tipoProducto === 'combo'`). */
  comboComponentes?: McComboComponente[]
  /** Si true, el cliente puede elegir color/tela de las prendas incluidas al comprar. */
  comboPermiteElegirColor?: boolean
  /** Si true, el cliente puede elegir la talla de las prendas incluidas al comprar. */
  comboPermiteElegirTalla?: boolean
  /** Suma de precios de componentes al crear/editar (referencia de ahorro). */
  comboPrecioSeparadoCop?: number
  /** Texto libre visible en la ficha pública del producto. */
  descripcion?: string
  precioCop: number
  /** Costo de adquisición por unidad (opcional; retrocompatible). */
  precioCostoCop?: number
  stock: number
  imageUrl?: string
  /** Fotos extra de galería (la principal sigue siendo `imageUrl`). */
  galeriaImagenes?: string[]
  /** Variantes (colores, telas, etc.). Si hay al menos una, el cliente elige antes de comprar. */
  variantes?: McProductoVariante[]
  /** Prenda de vestir o calzado: stock por talla y variantes limitadas a color/tela. */
  esRopa?: boolean
  /** Curva de tallas: letras (ropa) o numérica (zapatos). Default `ropa` si `esRopa`. */
  tallaModo?: McProductoTallaModo
  /** Color cuya portada se usa como imagen principal del producto (calzado). */
  imagenPrincipalColorId?: string
  /** Curva de tallas con stock individual (solo si `esRopa`). */
  tallas?: McProductoTalla[]
  /** Stock por combinación color × talla (solo si `esRopa` y hay variantes de color). */
  skus?: McProductoSku[]
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
  /** Muestra la cantidad disponible en la ficha pública del producto. */
  mostrarStockCatalogo?: boolean
  /** Descuento visible en catálogo (sobre precio base o variante). */
  descuentoActivo?: boolean
  descuentoTipo?: 'porcentaje' | 'monto_fijo'
  /** Porcentaje 0–100 o monto fijo en COP según `descuentoTipo`. */
  descuentoValor?: number
  /** IDs de categorías asociadas (`mc_tenants/{tid}/categorias`). */
  categoriaIds?: string[]
  /** Producto originado en inventario POS. */
  origenPos?: boolean
  /** Vínculo al artículo POS de origen. */
  posProductoId?: string
  /** Sede POS de la que proviene el inventario. */
  posSedeId?: string
  /** Falta imagen u otros datos para publicar en catálogo. */
  posPendientePublicar?: boolean
  /** Fulfillment: inventario propio o proveedor marketplace. */
  origenFulfillment?: 'propio' | 'proveedor'
  /** Proveedor marketplace (`mc_proveedores`). */
  proveedorId?: string
  proveedorProductoId?: string
  proveedorNombre?: string
  /** Lead time anunciado del proveedor (horas). */
  leadTimeHoras?: number
  /**
   * Oferta de reventa (dueño es proveedor). La fuente de verdad del catálogo
   * sigue siendo este producto; el marketplace es una proyección.
   */
  reventa?: McProductoReventa
  /** Promedio de reseñas aprobadas (1–5). */
  ratingAvg?: number
  /** Cantidad de reseñas aprobadas. */
  ratingCount?: number
}

/** Condiciones B2B al publicar un producto propio en el marketplace. */
export interface McProductoReventa {
  enabled: boolean
  proveedorId?: string
  /** Doc en `mc_proveedores/{id}/productos` (suele coincidir con este product id). */
  proveedorProductoId?: string
  /** Costo que pagan las otras tiendas (COP). */
  precioCostoCop: number
  /** Precio de venta sugerido al cliente final. */
  precioSugeridoCop?: number
  precioMinimoVentaCop?: number
  /**
   * Horas hasta despacho desde que llega el pedido.
   * 24 = mismo día / día siguiente; 48 = 1–2 días; etc.
   */
  leadTimeHoras: 24 | 48 | 72 | 96
  publishedAt?: number
  updatedAt?: number
}

/** Configuración de hardware POS por sede. */
export interface McPosSedeConfig {
  imprimirTicketAutomatico?: boolean
  abrirCajonEnVenta?: boolean
  nombreImpresora?: string
  urlBridge?: string
  /** 0 = pin 2 (Epson), 1 = pin 5. */
  cajonPin?: 0 | 1
}

/** Sede / punto de venta físico (`mc_tenants/{tid}/pos_sedes`). */
export interface McPosSede {
  id: string
  nombre: string
  codigo: string
  direccion?: string
  activa: boolean
  /** Si true, el inventario de esta sede puede publicarse en la tienda virtual. */
  mostrarEnTiendaVirtual?: boolean
  pos?: McPosSedeConfig
  createdAt: number
  updatedAt?: number
}

/** Variante opcional de un artículo POS (talla, color, etc.). */
export interface McPosVariante {
  id: string
  nombre: string
  /** Categoría de la opción: Color, Capacidad, Olor… */
  tipo?: string
  /** Muestra de color en UI (swatch), ej. #c41e3a. */
  hex?: string
  codigoBarras?: string
  /** Si se define, sustituye al precio base del producto. */
  precioCop?: number
}

/** Cómo se gestiona el stock en inventario POS. */
export type McPosStockModo = 'tallas' | 'variantes' | 'skus'

/** Artículo de inventario POS (`mc_tenants/{tid}/pos_productos`). */
export interface McPosProducto {
  id: string
  nombre: string
  tipoProducto?: McProductoTipo
  comboComponentes?: McComboComponente[]
  comboPermiteElegirColor?: boolean
  comboPermiteElegirTalla?: boolean
  codigo?: string
  codigoBarras?: string
  precioCop: number
  /** Costo de adquisición por unidad (opcional; retrocompatible). */
  precioCostoCop?: number
  activo: boolean
  sedeId: string
  /** Tallas ropa/zapatos vs variantes de catálogo (color, capacidad…) vs matriz color × talla. */
  posStockModo?: McPosStockModo
  /** Colores cuando `posStockModo === 'skus'` (stock en combinación con tallas). */
  posColores?: McPosVariante[]
  variantes?: McPosVariante[]
  createdAt: number
  updatedAt: number
  /** Producto de catálogo vinculado al publicar. */
  catalogProductoId?: string
  publicadoEnCatalogo?: boolean
}

/** Stock por sede y producto (`mc_tenants/{tid}/pos_stock`). */
export interface McPosStock {
  id: string
  sedeId: string
  productoId: string
  /** Ausente = producto sin variantes. En modo `skus`: id del color. */
  varianteId?: string
  /** Solo modo `skus`: id de la talla. */
  tallaId?: string
  cantidad: number
  updatedAt: number
}

export type McPosMetodoPago = 'efectivo' | 'transferencia' | 'nequi' | 'credito'

/** Cobro diferido: el cliente paga al recibir el producto. */
export type McPosEstadoPago = 'pendiente' | 'pagado'

export interface McPosLineaPago {
  metodo: McPosMetodoPago
  monto: number
}

export interface McPosLineaVenta {
  productoId: string
  varianteId?: string
  /** Talla vendida (modo `skus` en ropa). */
  tallaId?: string
  nombre: string
  cantidad: number
  precioUnitarioCop: number
  /** Costo unitario al momento de la venta (opcional). */
  costoUnitarioCop?: number
  descuentoCop?: number
  subtotalCop: number
  esCombo?: boolean
  componentesExpandidos?: McComboComponenteExpandido[]
  comboColorSeleccion?: McComboColorSeleccion[]
}

/** Cliente POS (`mc_tenants/{tid}/pos_clientes`). */
export interface McPosCliente {
  id: string
  nombre: string
  cedula: string
  ciudad: string
  direccion?: string
  /** Total acumulado de ventas activas asociadas. */
  totalComprasCop?: number
  ventasCount?: number
  ultimaCompraAt?: number
  createdAt: number
  updatedAt?: number
}

/** Venta registrada en caja (`mc_tenants/{tid}/pos_ventas`). */
export interface McPosVenta {
  id: string
  sedeId: string
  vendedorUid: string
  vendedorNombre: string
  lineas: McPosLineaVenta[]
  pagos: McPosLineaPago[]
  totalCop: number
  descuentoGlobalCop?: number
  motivoDescuentoGlobal?: string
  esCredito?: boolean
  /** Venta registrada sin cobro inmediato; el pago se completa al entregar. */
  esContraEntrega?: boolean
  estadoPago?: McPosEstadoPago
  /** Millis en que se registró el cobro (atribución de caja e ingresos). */
  pagadoAt?: number
  cobradoPorUid?: string
  cobradoPorNombre?: string
  /** Cliente asociado opcionalmente a la venta. */
  clienteId?: string
  /** Snapshot del nombre al momento de la venta. */
  clienteNombre?: string
  /** Snapshot de la cédula al momento de la venta. */
  clienteCedula?: string
  estado?: 'activa' | 'anulada'
  anuladaAt?: number
  anuladaPorUid?: string
  createdAt: number
}

export interface McPosCajaMovimiento {
  id: string
  tipo: 'ingreso' | 'egreso'
  montoCop: number
  descripcion: string
  comprobanteUrl?: string
  createdAt: number
}

/** Caja diaria por vendedor y sede (`mc_tenants/{tid}/pos_caja_diaria`). */
export interface McPosCajaDiaria {
  id: string
  sedeId: string
  vendedorUid: string
  fechaKey: string
  saldoInicialEfectivo: number
  estado: 'abierta' | 'cerrada'
  egresos: McPosCajaMovimiento[]
  ingresos: McPosCajaMovimiento[]
  efectivoContado?: number
  diferencia?: number
  notaCierre?: string
  ventasEfectivoDia?: number
  efectivoEsperado?: number
  cierreAt?: number
  createdAt: number
  updatedAt?: number
}

/** Turno de cajero (`mc_tenants/{tid}/pos_turnos`). */
export interface McPosTurno {
  id: string
  sedeId: string
  vendedorUid: string
  estado: 'abierto' | 'cerrado'
  inicioAt: number
  finAt?: number
}

export interface McPosDevolucionLinea {
  productoId: string
  varianteId?: string
  nombre: string
  cantidad: number
  montoReembolsoCop: number
}

/** Devolución o cambio (`mc_tenants/{tid}/pos_devoluciones`). */
export interface McPosDevolucion {
  id: string
  ventaId: string
  sedeId: string
  vendedorUid: string
  tipo: 'devolucion' | 'cambio'
  lineas: McPosDevolucionLinea[]
  lineasCambioSalida?: { productoId: string; nombre: string; cantidad: number }[]
  montoReembolsoCop: number
  createdAt: number
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
  /** Snapshot de la referencia del producto al momento del pedido. */
  referencia?: string
  cantidad: number
  precioUnitarioCop: number
  /** Costo unitario al momento de la venta (opcional). */
  costoUnitarioCop?: number
  varianteId?: string
  tallaId?: string
  subtitulo?: string
  esCombo?: boolean
  componentesExpandidos?: McComboComponenteExpandido[]
  comboColorSeleccion?: McComboColorSeleccion[]
  /** Dropship: id del proveedor marketplace. */
  proveedorId?: string
  proveedorProductoId?: string
}

export interface McOrdenCatalogo {
  createdAt: number
  updatedAt: number
  estado: McOrdenCatalogoEstado
  lineas: McOrdenCatalogoLinea[]
  /** Millis cuando se descontó inventario de componentes (idempotente). */
  inventarioDescontadoAt?: number
  /** Total cobrado: subtotal − descuento + envío. */
  totalCop: number
  pagoSimulado: boolean
  /** Pago con OnePay (catálogo) confirmado vía webhook. */
  pagoOnePay?: boolean
  onepayViewToken?: string
  onepayPaymentId?: string | null
  /** Pago con Addi (BNPL) confirmado vía callback. */
  pagoAddi?: boolean
  addiViewToken?: string
  addiApplicationId?: string | null
  addiStatus?: string
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
  /** Millis cuando se crearon POs a proveedores dropship. */
  proveedorPosCreadosAt?: number
  /** IDs de órdenes en `mc_proveedores/{id}/ordenes`. */
  proveedorPoIds?: string[]
  /** Pedido con pago contra entrega (COD). */
  pagoContraEntrega?: boolean
  /** Estado del recaudo COD con el cliente. */
  estadoPagoCod?: 'pendiente' | 'recaudado' | 'no_entregado' | 'devuelto'
  /** Monto que debe recaudar el mensajero (normalmente = totalCop). */
  montoRecaudarCop?: number
  recaudadoCodAt?: number
  /** Pedido regalado desde una wishlist compartible. */
  esRegalo?: boolean
  /** Id de `mc_tenants/{tid}/wishlists/{id}`. */
  wishlistId?: string
  /** Nombre de quien recibe el regalo (puede diferir del pagador). */
  destinatarioNombre?: string
}

/** Ítem de una lista de deseos compartible (regalos). */
export interface McWishlistItem {
  productId: string
  varianteId?: string
  tallaId?: string
  titulo: string
  referencia?: string
  subtitulo?: string
  precioUnitarioCop?: number
  imageUrl?: string
  /** Cantidad que la persona desea recibir. */
  cantidadDeseada: number
  /** Unidades ya compradas por amigos (parciales ok). */
  compradoCantidad?: number
}

export type McWishlistEstado = 'activa' | 'cerrada'

/**
 * Lista de deseos compartible (`mc_tenants/{tid}/wishlists/{id}`).
 * El creador define dónde llega el regalo; el amigo paga en checkout.
 */
export interface McWishlist {
  createdAt: number
  updatedAt: number
  estado: McWishlistEstado
  /** Token anónimo del editor (navegador). */
  sessionToken: string
  titulo: string
  mensaje?: string
  creadorNombre: string
  destinatarioNombre: string
  destinatarioTelefono?: string
  envioDepartamento: string
  envioCiudad: string
  envioDireccion: string
  envioReferencia?: string
  items: McWishlistItem[]
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
  /** Precio mensual del plan Master en COP. */
  planMasterPrecioMensualCop?: number
  /** Precio anual del plan Master en COP. */
  planMasterPrecioAnualCop?: number
  /** Nombre comercial del plan Master. */
  planMasterDisplayName?: string
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
  /**
   * Streams Mux de prueba para live shopping (`test: true` — watermark TEST, ~5 min).
   * Default: true si no está definido. Prioridad sobre `MC_MUX_LIVE_TEST` en Functions.
   */
  muxLiveTestEnabled?: boolean
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

/** Estado de una sesión de live shopping. */
export type McLiveSessionStatus = 'draft' | 'scheduled' | 'live' | 'ended'

export type McLiveStreamProvider = 'mux' | 'mock'

export type McLiveIngestMode = 'obs' | 'browser'

/** Sesión de transmisión en vivo (`mc_tenants/{tid}/live_sessions`). */
export interface McLiveSession {
  id: string
  status: McLiveSessionStatus
  title: string
  hostUid: string
  streamProvider: McLiveStreamProvider
  streamId: string
  playbackUrl: string
  ingestUrl: string
  streamKey: string
  featuredProductId: string | null
  featuredAt: number | null
  viewerCount: number
  purchaseCount: number
  chatEnabled: boolean
  shareUrl: string
  /** Slug público de la tienda (para reglas Firestore del viewer anónimo). */
  storeSlug?: string
  streamActive: boolean
  /** `obs` = RTMP externo; `browser` = cámara del navegador vía LiveKit. */
  ingestMode: McLiveIngestMode | null
  browserEgressId?: string | null
  recordingUrl?: string
  startedAt?: number
  endedAt?: number
  createdAt: number
  updatedAt: number
}

export interface McLiveSessionProductSnapshot {
  nombre: string
  precioCop: number
  precioOriginalCop?: number
  imageUrl?: string
  stock: number
}

/** Producto seleccionado para aparecer en el live. */
export interface McLiveSessionProduct {
  id: string
  productId: string
  orden: number
  pinnedAt: number | null
  snapshot: McLiveSessionProductSnapshot
  updatedAt: number
}

/** Tipo de marca en inscripción a taller (`mc_talleres/{slug}/registrations`). */
export type McTallerBrandType =
  | 'start_selling'
  | 'new_brand'
  | 'established_brand'
  | 'switch_for_costs'
  | 'other'

/** Taller / evento formativo (`mc_talleres/{slug}`). El `slug` es el id del documento. */
export interface McTaller {
  slug: string
  title: string
  description: string
  /** Fecha y hora del evento (epoch ms, zona America/Bogota al mostrar). */
  dateMs: number
  requirements: string[]
  zoomLink: string
  /** Alias legacy / redundante del enlace Meet. */
  meetLink?: string
  active: boolean
  createdAt: number
  updatedAt: number
}

/** Inscripción a un taller. */
export interface McTallerRegistration {
  fullName: string
  brandName: string
  brandType: McTallerBrandType
  /** Texto libre cuando `brandType === 'other'`. */
  brandTypeOther?: string
  email: string
  whatsapp: string
  createdAt: number
  confirmationEmailSentAt?: number
  lastReminderSentAt?: number
}

export type McLiveChatMessageType = 'message' | 'purchase' | 'system'

/** Mensaje del chat en vivo. */
export interface McLiveChatMessage {
  id: string
  uid: string | null
  displayName: string
  text: string
  type: McLiveChatMessageType
  createdAt: number
}

export type McProductReviewStatus = 'pending' | 'approved' | 'rejected'

/** Reseña de producto del catálogo (compra verificada vía pedido). */
export interface McProductReview {
  id: string
  productId: string
  productNombre?: string
  orderId: string
  rating: number
  comentario: string
  clienteNombre: string
  /** Email del pedido (interno); ya no se pide al cliente al reseñar. */
  clienteEmail?: string
  /** Foto opcional de cómo le quedó el producto. */
  imageUrl?: string
  status: McProductReviewStatus
  verifiedPurchase: boolean
  createdAt: number
  updatedAt: number
  moderatedAt?: number
  moderatedByUid?: string
}
