import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import clsx from 'clsx'
import { collection, doc, setDoc } from 'firebase/firestore'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { cartLineKey } from '@/catalog-local/cartLineKey'
import { firebaseConfigured, getDb, getFirebaseFunctions } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { mcOrdenesCatalogoCollection } from '@/lib/mcCollections'
import {
  buscarCuponActivo,
  descuentoDesdeCupon,
  normalizeCuponCodigo,
  totalCheckoutCop,
} from '@/lib/checkoutPricing'
import { MC_ENVIO_CHECKOUT_ETIQUETA } from '@/lib/envioCotizacion'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { useEnvioCheckoutQuote } from '@/hooks/useEnvioCheckoutQuote'
import type { McCuponTienda, McOrdenCatalogoLinea } from '@/types/mc'
import { McPublicPageLoadingFallback } from '@/components/McPublicPageLoadingFallback'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { buildStorePublicPath } from '@/lib/storePublicUrl'
import { usePublicCheckoutStartTracking } from '@/public/usePublicCatalogAnalytics'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { COLOMBIA_DEPARTAMENTOS, formatoDepartamentoEtiqueta, MC_CHECKOUT_DOCUMENTO_TIPOS } from '@/lib/colombiaGeo'
import { buildCheckoutWhatsappText, whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import { rememberLocalOrderId } from '@/lib/catalogLocalOrders'
import { buildNumeroReferencia, publicCatalogSuccessPath } from '@/lib/catalogOrderTracking'
import { IconWhatsApp } from '@/icons/McIcons'
import { enrichCatalogLineasWithCost } from '@/lib/catalogLineCost'
import { fulfillCatalogOrder } from '@/lib/catalogFulfillClient'
import { markCarritoIniciadoOnOrderComplete } from '@/lib/markCarritoIniciadoOnOrder'
import { useCarritoIniciadoCheckoutSync } from '@/hooks/useCarritoIniciadoCheckoutSync'
import { useWishlistCheckoutHydration } from '@/hooks/useWishlistCheckoutHydration'
import { recordWishlistPurchase, type WishlistPublicView } from '@/lib/wishlist'
import {
  CHECKOUT_STEP_META,
  CHECKOUT_STEPS,
  checkoutStepIndex,
  validateCheckoutAll,
  validateCheckoutStep,
  type CheckoutFields,
  type CheckoutStepId,
} from '@/lib/checkoutValidation'
import { CheckoutStepIndicator } from '@/public/checkout/CheckoutStepIndicator'
import {
  MC_ONEPAY_DONE_MSG,
  MC_ONEPAY_POPUP_NAME,
  publicCatalogOnePayReturnPath,
} from '@/public/onepayCheckoutPaths'
import {
  MC_ADDI_DONE_MSG,
  MC_ADDI_POPUP_NAME,
  publicCatalogAddiReturnPath,
} from '@/public/addiCheckoutPaths'
import { ADDI_CHECKOUT_MIN_COP, isAddiReadyForCheckout } from '@/lib/addiAccess'

function callableErrorMessage(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'No se pudo abrir el pago.'
}

export function PublicCheckoutPage() {
  const { slug, to } = usePublicStore()
  usePublicCheckoutStartTracking()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenantId, tenant, platformSettings, loading, error, isPreview } = useCatalogTenant()
  const { lines, totalPiezas, clear, restoreLines } = useCatalogoSimpleCart()

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [envioCiudad, setEnvioCiudad] = useState('')
  const [envioDepartamento, setEnvioDepartamento] = useState('')
  const [ciudadManual, setCiudadManual] = useState(false)
  const [envioDireccion, setEnvioDireccion] = useState('')
  const [envioReferencia, setEnvioReferencia] = useState('')
  const [clienteTipoDocumento, setClienteTipoDocumento] = useState('')
  const [clienteDocumentoNumero, setClienteDocumentoNumero] = useState('')
  const [nota, setNota] = useState('')
  const [cuponInput, setCuponInput] = useState('')
  const [cuponAplicado, setCuponAplicado] = useState<McCuponTienda | null>(null)
  const [cuponError, setCuponError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [onepayBusy, setOnepayBusy] = useState(false)
  const [addiBusy, setAddiBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStepId>('revisar')
  /** Método de cobro en el último paso. */
  const [pagoMetodoCheckout, setPagoMetodoCheckout] = useState<
    'default' | 'addi' | 'contraentrega'
  >('default')
  const [giftWishlist, setGiftWishlist] = useState<WishlistPublicView | null>(null)

  const onGiftLoaded = useCallback((wishlist: WishlistPublicView) => {
    setGiftWishlist(wishlist)
    setEnvioDepartamento(wishlist.envioDepartamento || '')
    setEnvioCiudad(wishlist.envioCiudad || '')
    setEnvioDireccion(wishlist.envioDireccion || '')
    setEnvioReferencia(wishlist.envioReferencia || '')
    setCiudadManual(true)
  }, [])

  const { wishlistId: giftWishlistId, loading: giftLoading, error: giftError } = useWishlistCheckoutHydration({
    slug,
    tenantId,
    searchParams,
    restoreLines,
    onGiftLoaded,
  })

  const esRegalo = Boolean(giftWishlistId && giftWishlist)

  useEffect(() => {
    setErrMsg(null)
  }, [checkoutStep])

  /** Links antiguos de OnePay que apuntaban a `/checkout?onepay=1`: redirect a la vista dedicada. */
  useEffect(() => {
    if (!slug) return
    if (searchParams.get('onepay') !== '1') return
    const o = searchParams.get('o')
    const ov = searchParams.get('ov')
    if (!o || !ov) return
    navigate(publicCatalogOnePayReturnPath(slug, o, ov), { replace: true })
  }, [slug, searchParams, navigate])

  /** Popup OnePay / Addi: la pestaña principal recibe la URL de validación y navega ahí. */
  useEffect(() => {
    function onWinMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; pathname?: string; search?: string }
      if (
        (d?.type !== MC_ONEPAY_DONE_MSG && d?.type !== MC_ADDI_DONE_MSG) ||
        typeof d.pathname !== 'string'
      ) {
        return
      }
      const expectedPath = slug ? buildStorePublicPath(slug, '/checkout/pago-validando') : null
      if (!expectedPath || d.pathname !== expectedPath) return
      let q = ''
      if (typeof d.search === 'string' && d.search.length > 0) {
        q = d.search.startsWith('?') ? d.search : `?${d.search}`
      }
      navigate(`${d.pathname}${q}`, { replace: true })
    }
    window.addEventListener('message', onWinMessage)
    return () => window.removeEventListener('message', onWinMessage)
  }, [slug, navigate])

  /** Links antiguos / retorno Addi con query en checkout. */
  useEffect(() => {
    if (!slug) return
    if (searchParams.get('addi') !== '1') return
    const o = searchParams.get('o')
    const ov = searchParams.get('ov')
    if (!o || !ov) return
    navigate(publicCatalogAddiReturnPath(slug, o, ov), { replace: true })
  }, [slug, searchParams, navigate])

  const { lineasOrden, subtotalCop, preciosOk } = useMemo(() => {
    const lineas: McOrdenCatalogoLinea[] = lines.map((l) => ({
      productId: l.productId,
      nombre: l.titulo,
      ...(l.referencia?.trim() ? { referencia: l.referencia.trim() } : {}),
      cantidad: l.cantidad,
      precioUnitarioCop: Math.max(0, Math.round(l.precioUnitarioCop ?? 0)),
      ...(l.varianteId ? { varianteId: l.varianteId } : {}),
      ...(l.tallaId ? { tallaId: l.tallaId } : {}),
      ...(l.subtitulo ? { subtitulo: l.subtitulo } : {}),
      ...(l.esCombo ? { esCombo: true } : {}),
      ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
    }))
    const t = lineas.reduce((s, x) => s + x.precioUnitarioCop * x.cantidad, 0)
    const ok = lineas.every((x) => x.precioUnitarioCop > 0)
    return { lineasOrden: lineas, subtotalCop: t, preciosOk: ok }
  }, [lines])

  const {
    envioCop,
    lineaEnvio,
    fuente: envioFuente,
    seleccionada: envioSeleccionada,
    loading: envioQuoteLoading,
    error: envioQuoteError,
  } = useEnvioCheckoutQuote({
    slug,
    tenant: tenant ?? undefined,
    platformSettings: platformSettings ?? undefined,
    envioDepartamento,
    envioCiudad,
    envioDireccion,
    destinoNombre: esRegalo
      ? giftWishlist?.destinatarioNombre || giftWishlist?.creadorNombre || nombre
      : nombre,
    destinoTelefono: esRegalo ? giftWishlist?.destinatarioTelefono || telefono : telefono,
    subtotalCop,
    totalPiezas,
  })

  const envioLabel = MC_ENVIO_CHECKOUT_ETIQUETA

  const descuentoCop = useMemo(() => {
    if (!cuponAplicado) return 0
    return descuentoDesdeCupon(subtotalCop, cuponAplicado)
  }, [cuponAplicado, subtotalCop])

  const totalCop = useMemo(
    () => totalCheckoutCop(subtotalCop, envioCop, descuentoCop),
    [subtotalCop, envioCop, descuentoCop],
  )

  const checkoutVentasModoExplicit = useMemo(() => explicitCheckoutVentasModo(tenant), [tenant])

  const carritoContacto = useMemo(
    () => ({
      nombre,
      telefono,
      email,
      envioCiudad,
      envioDepartamento,
      envioDireccion,
    }),
    [nombre, telefono, email, envioCiudad, envioDepartamento, envioDireccion],
  )

  const { carritoIniciadoId } = useCarritoIniciadoCheckoutSync({
    slug,
    tenantId,
    tenant: tenant ?? undefined,
    lines,
    contacto: carritoContacto,
    restoreLines,
    setCuponAplicado,
    setCuponInput,
    searchParams,
  })

  const pasarelaMicatalogoOk = platformSettings?.pasarelaMicatalogoActiva === true

  /** Mostrar cobro OnePay: comercio propio o pasarela Mi Catálogo activa a nivel plataforma. */
  const mostrarOnepayEnCheckout = useMemo(() => {
    const modo = checkoutVentasModoExplicit
    return (
      (modo === 'pasarela' && tenant?.onepayPaymentsEnabled === true) ||
      (modo === 'pasarela_micatalogo' && pasarelaMicatalogoOk)
    )
  }, [checkoutVentasModoExplicit, tenant?.onepayPaymentsEnabled, pasarelaMicatalogoOk])

  const mostrarAddiEnCheckout = useMemo(() => {
    if (!isAddiReadyForCheckout(tenant)) return false
    return totalCop >= ADDI_CHECKOUT_MIN_COP
  }, [tenant, totalCop])

  const contraentregaDisponible = tenant?.contraentregaCatalogoEnabled === true
  const mostrarSelectorMetodoPago =
    contraentregaDisponible || (mostrarOnepayEnCheckout && mostrarAddiEnCheckout)

  useEffect(() => {
    if (pagoMetodoCheckout === 'addi' && !mostrarAddiEnCheckout) {
      setPagoMetodoCheckout('default')
    }
  }, [pagoMetodoCheckout, mostrarAddiEnCheckout])

  function checkoutFields(): CheckoutFields {
    return {
      nombre,
      telefono,
      email,
      clienteTipoDocumento,
      clienteDocumentoNumero,
      envioDepartamento,
      envioCiudad,
      envioDireccion,
    }
  }

  function cuponEsInvalido(): boolean {
    if (!cuponAplicado) return false
    return !buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
  }

  function validateStepOpts() {
    return { preciosOk, cuponInvalid: cuponEsInvalido() }
  }

  function goCheckoutNext() {
    setErrMsg(null)
    const err = validateCheckoutStep(checkoutStep, checkoutFields(), validateStepOpts())
    if (err) {
      setErrMsg(err)
      return
    }
    const i = checkoutStepIndex(checkoutStep)
    if (i < CHECKOUT_STEPS.length - 1) {
      setCheckoutStep(CHECKOUT_STEPS[i + 1]!)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goCheckoutBack() {
    setErrMsg(null)
    const i = checkoutStepIndex(checkoutStep)
    if (i > 0) {
      setCheckoutStep(CHECKOUT_STEPS[i - 1]!)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goToCheckoutStep(step: CheckoutStepId) {
    const targetIdx = checkoutStepIndex(step)
    const currentIdx = checkoutStepIndex(checkoutStep)
    if (targetIdx >= currentIdx) return
    setErrMsg(null)
    setCheckoutStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateBeforeSubmit(): string | null {
    return validateCheckoutAll(checkoutFields(), validateStepOpts())
  }

  function giftOrderFields(): Record<string, unknown> {
    if (!esRegalo || !giftWishlistId || !giftWishlist) return {}
    return {
      esRegalo: true,
      wishlistId: giftWishlistId,
      destinatarioNombre: giftWishlist.destinatarioNombre,
    }
  }

  async function afterOrderCreated(orderId: string) {
    if (!slug) return
    rememberLocalOrderId(slug, orderId)
    if (!esRegalo) return
    try {
      await recordWishlistPurchase(slug, orderId)
    } catch (e) {
      console.warn('[checkout] wishlist purchase record:', e)
    }
  }

  function aplicarCupon() {
    setCuponError(null)
    const key = normalizeCuponCodigo(cuponInput)
    if (!key) {
      setCuponError('Escribí un código.')
      return
    }
    const found = buscarCuponActivo(cuponInput, tenant?.cuponesCatalogo)
    if (!found) {
      setCuponAplicado(null)
      setCuponError('Código no válido o inactivo.')
      return
    }
    setCuponAplicado(found)
    setCuponError(null)
  }

  function quitarCupon() {
    setCuponAplicado(null)
    setCuponInput('')
    setCuponError(null)
  }

  async function pagarContraEntrega() {
    setErrMsg(null)
    if (!slug || !tenantId || !firebaseConfigured) {
      setErrMsg('No se puede completar la compra ahora.')
      return
    }
    if (!tenant?.contraentregaCatalogoEnabled) {
      setErrMsg('Esta tienda no tiene contraentrega activa.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (!preciosOk || subtotalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio para comprar en línea.')
      return
    }
    const submitErr = validateBeforeSubmit()
    if (submitErr) {
      setErrMsg(submitErr)
      return
    }
    const cuponVigente = cuponAplicado
      ? buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
      : null
    if (cuponAplicado && !cuponVigente) {
      setErrMsg('El cupón ya no está disponible. Quitá el cupón o probá otro código.')
      return
    }
    const descFinal = cuponVigente ? descuentoDesdeCupon(subtotalCop, cuponVigente) : 0
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
    if (totalFinal <= 0) {
      setErrMsg('El total no es válido para contraentrega.')
      return
    }
    const now = Date.now()
    const viewToken = crypto.randomUUID().replace(/-/g, '')
    setBusy(true)
    try {
      const db = getDb()
      const orderRef = doc(collection(db, mcOrdenesCatalogoCollection(tenantId)))
      const numeroReferencia = buildNumeroReferencia(orderRef.id)
      const lineasConCosto = await enrichCatalogLineasWithCost(tenantId, lineasOrden)
      const base: Record<string, unknown> = {
        createdAt: now,
        updatedAt: now,
        estado: 'en_preparacion',
        lineas: lineasConCosto,
        subtotalCop,
        envioCop,
        descuentoCop: descFinal,
        totalCop: totalFinal,
        pagoSimulado: false,
        pagoContraEntrega: true,
        estadoPagoCod: 'pendiente',
        montoRecaudarCop: totalFinal,
        onepayViewToken: viewToken,
        numeroReferencia,
        seguimientoPreparacionAt: now,
      }
      if (nombre.trim()) base.clienteNombre = nombre.trim()
      if (telefono.trim()) base.clienteTelefono = telefono.trim()
      base.clienteEmail = email.trim().toLowerCase()
      base.clienteTipoDocumento = clienteTipoDocumento.trim().toUpperCase()
      base.clienteDocumentoNumero = clienteDocumentoNumero.trim()
      if (nota.trim()) base.notaCliente = nota.trim()
      if (envioCiudad.trim()) base.envioCiudad = envioCiudad.trim()
      if (envioDepartamento.trim()) base.envioDepartamento = envioDepartamento.trim()
      if (envioDireccion.trim()) base.envioDireccion = envioDireccion.trim()
      if (envioReferencia.trim()) base.envioReferencia = envioReferencia.trim()
      if (envioSeleccionada) {
        base.envioCotizacionCarrier = envioSeleccionada.carrier
        base.envioCotizacionServicio = envioSeleccionada.service
        if (envioSeleccionada.deliveryEstimate) {
          base.envioCotizacionEntrega = envioSeleccionada.deliveryEstimate
        }
        base.envioCotizacionFuente = envioFuente
      } else if (envioFuente === 'estatico') {
        base.envioCotizacionFuente = 'estatico'
      }
      if (cuponVigente) base.cuponCodigo = normalizeCuponCodigo(cuponVigente.codigo)
      if (carritoIniciadoId) base.carritoIniciadoId = carritoIniciadoId
      Object.assign(base, giftOrderFields())
      if (esRegalo && giftWishlist) {
        const giftNote = `Regalo para ${giftWishlist.destinatarioNombre}`
        base.notaCliente = nota.trim() ? `${giftNote}. ${nota.trim()}` : giftNote
      }

      await setDoc(orderRef, base)
      try {
        await fulfillCatalogOrder(tenantId, orderRef.id)
      } catch (fulfillErr) {
        console.warn('[checkout] fulfill inventario COD:', fulfillErr)
      }
      await markCarritoIniciadoOnOrderComplete({
        tenantId,
        slug,
        carritoIniciadoId,
        orderId: orderRef.id,
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
      })
      await afterOrderCreated(orderRef.id)
      clear()
      navigate(publicCatalogSuccessPath(slug, orderRef.id), { replace: true })
    } catch {
      setErrMsg('No se pudo registrar el pedido contraentrega. Intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  async function pagarSimulado(e: React.FormEvent) {
    e.preventDefault()
    if (pagoMetodoCheckout === 'contraentrega') {
      await pagarContraEntrega()
      return
    }
    setErrMsg(null)
    if (!slug || !tenantId || !firebaseConfigured) {
      setErrMsg('No se puede completar la compra ahora.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (!tenant || explicitCheckoutVentasModo(tenant) === null) {
      setErrMsg('Esta tienda aún no configuró cómo acepta pagos.')
      return
    }
    if (!preciosOk || subtotalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio para comprar en línea.')
      return
    }
    const submitErr = validateBeforeSubmit()
    if (submitErr) {
      setErrMsg(submitErr)
      return
    }
    const cuponVigente = cuponAplicado
      ? buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
      : null
    if (cuponAplicado && !cuponVigente) {
      setErrMsg('El cupón ya no está disponible. Quitá el cupón o probá otro código.')
      return
    }
    const descFinal = cuponVigente ? descuentoDesdeCupon(subtotalCop, cuponVigente) : 0
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
    if (totalFinal < 0) {
      setErrMsg('El total no es válido.')
      return
    }
    const now = Date.now()
    const viewToken = crypto.randomUUID().replace(/-/g, '')
    setBusy(true)
    try {
      const db = getDb()
      const orderRef = doc(collection(db, mcOrdenesCatalogoCollection(tenantId)))
      const numeroReferencia = buildNumeroReferencia(orderRef.id)
      const lineasConCosto = await enrichCatalogLineasWithCost(tenantId, lineasOrden)
      const base: Record<string, unknown> = {
        createdAt: now,
        updatedAt: now,
        estado: 'pagado',
        lineas: lineasConCosto,
        subtotalCop,
        envioCop,
        descuentoCop: descFinal,
        totalCop: totalFinal,
        pagoSimulado: true,
        onepayViewToken: viewToken,
        numeroReferencia,
        seguimientoCompraAt: now,
      }
      if (nombre.trim()) base.clienteNombre = nombre.trim()
      if (telefono.trim()) base.clienteTelefono = telefono.trim()
      base.clienteEmail = email.trim().toLowerCase()
      base.clienteTipoDocumento = clienteTipoDocumento.trim().toUpperCase()
      base.clienteDocumentoNumero = clienteDocumentoNumero.trim()
      if (nota.trim()) base.notaCliente = nota.trim()
      if (envioCiudad.trim()) base.envioCiudad = envioCiudad.trim()
      if (envioDepartamento.trim()) base.envioDepartamento = envioDepartamento.trim()
      if (envioDireccion.trim()) base.envioDireccion = envioDireccion.trim()
      if (envioReferencia.trim()) base.envioReferencia = envioReferencia.trim()
      if (envioSeleccionada) {
        base.envioCotizacionCarrier = envioSeleccionada.carrier
        base.envioCotizacionServicio = envioSeleccionada.service
        if (envioSeleccionada.deliveryEstimate) {
          base.envioCotizacionEntrega = envioSeleccionada.deliveryEstimate
        }
        base.envioCotizacionFuente = envioFuente
      } else if (envioFuente === 'estatico') {
        base.envioCotizacionFuente = 'estatico'
      }
      if (cuponVigente) base.cuponCodigo = normalizeCuponCodigo(cuponVigente.codigo)
      if (carritoIniciadoId) base.carritoIniciadoId = carritoIniciadoId
      Object.assign(base, giftOrderFields())
      if (esRegalo && giftWishlist) {
        const giftNote = `Regalo para ${giftWishlist.destinatarioNombre}`
        base.notaCliente = nota.trim() ? `${giftNote}. ${nota.trim()}` : giftNote
      }

      await setDoc(orderRef, base)
      try {
        await fulfillCatalogOrder(tenantId, orderRef.id)
      } catch (fulfillErr) {
        console.warn('[checkout] fulfill inventario:', fulfillErr)
      }
      await markCarritoIniciadoOnOrderComplete({
        tenantId,
        slug,
        carritoIniciadoId,
        orderId: orderRef.id,
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
      })
      await afterOrderCreated(orderRef.id)
      clear()
      navigate(publicCatalogSuccessPath(slug, orderRef.id), { replace: true })
    } catch {
      setErrMsg('No se pudo registrar la venta. Intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function pedirPorWhatsapp() {
    setErrMsg(null)
    if (!slug || !tenant) {
      setErrMsg('No se puede enviar el pedido ahora.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (explicitCheckoutVentasModo(tenant) !== 'whatsapp') {
      setErrMsg('Esta tienda no acepta pedidos por WhatsApp en el checkout.')
      return
    }
    if (!preciosOk || subtotalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio para pedir en línea.')
      return
    }
    const submitErr = validateBeforeSubmit()
    if (submitErr) {
      setErrMsg(submitErr)
      return
    }
    const cuponVigente = cuponAplicado
      ? buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
      : null
    if (cuponAplicado && !cuponVigente) {
      setErrMsg('El cupón ya no está disponible. Quitá el cupón o probá otro código.')
      return
    }
    const descFinal = cuponVigente ? descuentoDesdeCupon(subtotalCop, cuponVigente) : 0
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
    if (totalFinal < 0) {
      setErrMsg('El total no es válido.')
      return
    }
    const waDigits = tenant.whatsappNumero?.replace(/\D/g, '') ?? ''
    if (waDigits.length < 10) {
      setErrMsg('La tienda aún no configuró un WhatsApp válido para pedidos.')
      return
    }
    const waText = buildCheckoutWhatsappText(lines, tenant.mensajeIntro, {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      clienteTipoDocumento: clienteTipoDocumento.trim().toUpperCase(),
      clienteDocumentoNumero: clienteDocumentoNumero.trim(),
      envioDepartamento: formatoDepartamentoEtiqueta(envioDepartamento.trim()),
      envioCiudad: envioCiudad.trim(),
      envioDireccion: envioDireccion.trim(),
      envioReferencia: envioReferencia.trim() || undefined,
      nota: nota.trim() || undefined,
      subtotalCop,
      envioCop,
      descuentoCop: descFinal,
      totalCop: totalFinal,
      envioLabel,
      cuponCodigo: cuponVigente ? normalizeCuponCodigo(cuponVigente.codigo) : undefined,
    })
    const url = whatsappUrlFromNumber(waDigits, waText)
    if (!url) {
      setErrMsg('No se pudo abrir WhatsApp.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function pagarConOnepay() {
    setErrMsg(null)
    if (!slug || !tenantId || !firebaseConfigured) {
      setErrMsg('No se puede pagar ahora.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (!tenant || explicitCheckoutVentasModo(tenant) === null) {
      setErrMsg('Esta tienda aún no configuró cómo acepta pagos.')
      return
    }
    if (!preciosOk || subtotalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio.')
      return
    }
    const submitErr = validateBeforeSubmit()
    if (submitErr) {
      setErrMsg(submitErr)
      return
    }
    const cuponVigente = cuponAplicado
      ? buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
      : null
    if (cuponAplicado && !cuponVigente) {
      setErrMsg('El cupón ya no está disponible.')
      return
    }
    const descFinal = cuponVigente ? descuentoDesdeCupon(subtotalCop, cuponVigente) : 0
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
    if (totalFinal < 1_000) {
      setErrMsg('El total no es válido.')
      return
    }
    if (!mostrarOnepayEnCheckout) {
      setErrMsg('Esta tienda no tiene OnePay activado para el checkout.')
      return
    }

    let popup: Window | null = null
    try {
      popup = window.open('about:blank', MC_ONEPAY_POPUP_NAME, 'popup=yes,width=520,height=800')
      if (popup) {
        try {
          popup.document.title = 'OnePay · Mi Catálogo'
          const el = popup.document.body
          el.style.margin = '0'
          el.style.fontFamily =
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
          el.style.padding = '2rem'
          el.style.textAlign = 'center'
          el.style.color = '#334155'
          el.innerHTML =
            '<p style="margin:0 0 .5rem;font-size:.95rem">Conectando con OnePay…</p><p style="margin:0;font-size:.8rem;opacity:.75">Si no se abre el cobro, permití ventanas emergentes para esta tienda.</p>'
        } catch {
          /* about:blank access puede fallar en algunos navegadores; el.href igual resuelve */
        }
      }
    } catch {
      popup = null
    }

    setOnepayBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcOnepayStartCatalogCheckout')
      const res = await fn({
        slug,
        lineas: lines.map((l) => ({
          productId: l.productId,
          cantidad: l.cantidad,
          ...(l.varianteId ? { varianteId: l.varianteId } : {}),
          ...(l.tallaId ? { tallaId: l.tallaId } : {}),
          ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
        })),
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        nota: nota.trim() || undefined,
        clienteTipoDocumento: clienteTipoDocumento.trim().toUpperCase(),
        clienteDocumentoNumero: clienteDocumentoNumero.trim(),
        envioCiudad: envioCiudad.trim(),
        envioDepartamento: envioDepartamento.trim() || undefined,
        envioDireccion: envioDireccion.trim(),
        envioReferencia: envioReferencia.trim() || undefined,
        redirectOrigin: window.location.origin,
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `mc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        carritoIniciadoId: carritoIniciadoId ?? undefined,
        ...(esRegalo && giftWishlistId && giftWishlist
          ? {
              esRegalo: true,
              wishlistId: giftWishlistId,
              destinatarioNombre: giftWishlist.destinatarioNombre,
            }
          : {}),
      })
      const data = res.data as { paymentLink?: string }
      if (!data.paymentLink) {
        if (popup && !popup.closed) popup.close()
        setErrMsg('No se recibió el link de pago.')
        return
      }
      if (popup && !popup.closed) {
        popup.location.href = data.paymentLink
      } else {
        window.location.assign(data.paymentLink)
      }
    } catch (e) {
      if (popup && !popup.closed) popup.close()
      setErrMsg(callableErrorMessage(e))
    } finally {
      setOnepayBusy(false)
    }
  }

  async function pagarConAddi() {
    setErrMsg(null)
    if (!slug || !tenantId || !firebaseConfigured) {
      setErrMsg('No se puede pagar ahora.')
      return
    }
    if (lines.length === 0 || totalPiezas === 0) {
      setErrMsg('Tu carrito está vacío.')
      return
    }
    if (!preciosOk || subtotalCop <= 0) {
      setErrMsg('Todos los productos deben tener precio.')
      return
    }
    const submitErr = validateBeforeSubmit()
    if (submitErr) {
      setErrMsg(submitErr)
      return
    }
    const cuponVigente = cuponAplicado
      ? buscarCuponActivo(cuponAplicado.codigo, tenant?.cuponesCatalogo)
      : null
    if (cuponAplicado && !cuponVigente) {
      setErrMsg('El cupón ya no está disponible.')
      return
    }
    const descFinal = cuponVigente ? descuentoDesdeCupon(subtotalCop, cuponVigente) : 0
    const totalFinal = totalCheckoutCop(subtotalCop, envioCop, descFinal)
    if (totalFinal < ADDI_CHECKOUT_MIN_COP) {
      setErrMsg(`Addi aplica desde ${ADDI_CHECKOUT_MIN_COP.toLocaleString('es-CO')} COP.`)
      return
    }
    if (!mostrarAddiEnCheckout) {
      setErrMsg('Esta tienda no tiene Addi activado para el checkout.')
      return
    }

    let popup: Window | null = null
    try {
      popup = window.open('about:blank', MC_ADDI_POPUP_NAME, 'popup=yes,width=520,height=800')
      if (popup) {
        try {
          popup.document.title = 'Addi · Mi Catálogo'
          const el = popup.document.body
          el.style.margin = '0'
          el.style.fontFamily =
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
          el.style.padding = '2rem'
          el.style.textAlign = 'center'
          el.style.color = '#334155'
          el.innerHTML =
            '<p style="margin:0 0 .5rem;font-size:.95rem">Conectando con Addi…</p><p style="margin:0;font-size:.8rem;opacity:.75">Si no se abre el cobro, permití ventanas emergentes para esta tienda.</p>'
        } catch {
          /* */
        }
      }
    } catch {
      popup = null
    }

    setAddiBusy(true)
    try {
      const fn = httpsCallable(getFirebaseFunctions(), 'mcAddiStartCatalogCheckout')
      const res = await fn({
        slug,
        lineas: lines.map((l) => ({
          productId: l.productId,
          cantidad: l.cantidad,
          ...(l.varianteId ? { varianteId: l.varianteId } : {}),
          ...(l.tallaId ? { tallaId: l.tallaId } : {}),
          ...(l.comboColorSeleccion?.length ? { comboColorSeleccion: l.comboColorSeleccion } : {}),
        })),
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        nota: nota.trim() || undefined,
        clienteTipoDocumento: clienteTipoDocumento.trim().toUpperCase(),
        clienteDocumentoNumero: clienteDocumentoNumero.trim(),
        envioCiudad: envioCiudad.trim(),
        envioDepartamento: envioDepartamento.trim() || undefined,
        envioDireccion: envioDireccion.trim(),
        envioReferencia: envioReferencia.trim() || undefined,
        redirectOrigin: window.location.origin,
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `mc-addi-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        carritoIniciadoId: carritoIniciadoId ?? undefined,
        ...(esRegalo && giftWishlistId && giftWishlist
          ? {
              esRegalo: true,
              wishlistId: giftWishlistId,
              destinatarioNombre: giftWishlist.destinatarioNombre,
            }
          : {}),
      })
      const data = res.data as { paymentLink?: string }
      if (!data.paymentLink) {
        if (popup && !popup.closed) popup.close()
        setErrMsg('No se recibió el link de Addi.')
        return
      }
      if (popup && !popup.closed) {
        popup.location.href = data.paymentLink
      } else {
        window.location.assign(data.paymentLink)
      }
    } catch (e) {
      if (popup && !popup.closed) popup.close()
      setErrMsg(callableErrorMessage(e))
    } finally {
      setAddiBusy(false)
    }
  }

  if (!slug) return null

  if (isPreview) {
    return (
      <div className="mc-public-catalog-inset max-w-lg space-y-4 py-12">
        <p className="text-sm font-medium mc-pc-text">Checkout no disponible en vista previa</p>
        <p className="text-sm leading-relaxed mc-pc-muted">
          Publicá tu tienda con el plan Expert para que tus clientes puedan comprar.
        </p>
        <Link
          to={to('/')}
          className="inline-block text-sm font-medium mc-pc-text underline decoration-neutral-300 underline-offset-4"
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (loading) {
    return <McPublicPageLoadingFallback />
  }

  if (error || !tenantId || !tenant) {
    return (
      <div className="mc-public-catalog-inset py-16 text-center text-sm leading-relaxed mc-pc-muted">
        {error ?? 'Catálogo no disponible.'}
      </div>
    )
  }

  if (giftLoading) {
    return <McPublicPageLoadingFallback />
  }

  if (giftWishlistId && giftError) {
    return (
      <div className="mc-public-catalog-inset max-w-lg space-y-4 py-12">
        <p className="text-sm leading-relaxed mc-pc-text">{giftError}</p>
        <Link
          to={to(`/lista/${giftWishlistId}`)}
          className="inline-block text-sm font-medium mc-pc-text underline decoration-neutral-300 underline-offset-4"
        >
          Volver a la lista
        </Link>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="mc-public-catalog-inset max-w-lg space-y-6 py-12">
        <p className="text-sm leading-relaxed mc-pc-text">No hay productos en el carrito.</p>
        <Link
          to={giftWishlistId ? to(`/lista/${giftWishlistId}`) : to('/')}
          className="inline-block text-sm font-medium mc-pc-text underline decoration-neutral-300 underline-offset-4 transition duration-200 ease-in-out hover:opacity-65"
        >
          {giftWishlistId ? 'Volver a la lista' : 'Volver al catálogo'}
        </Link>
      </div>
    )
  }

  if (checkoutVentasModoExplicit === null) {
    return (
      <div className="mc-public-catalog-inset max-w-lg space-y-6 py-12">
        <p className="text-sm font-medium mc-pc-text">Checkout pausado</p>
        <p className="text-sm leading-relaxed mc-pc-muted">
          La tienda todavía no eligió cómo cobrar en el checkout. Si sos la persona que administra esta tienda, entrá al
          panel en <strong className="font-medium mc-pc-text">Cuenta</strong>, sección{' '}
          <strong className="font-medium mc-pc-text">Checkout · cómo cerrás ventas</strong>, y guardá tu elección.
        </p>
        <Link
          to={to('/')}
          className="inline-block text-sm font-medium mc-pc-text underline decoration-neutral-300 underline-offset-4 transition duration-200 ease-in-out hover:opacity-65"
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  const checkoutVentasModo = checkoutVentasModoExplicit

  const fieldClass =
    'mt-1.5 w-full rounded-md border mc-pc-border bg-[var(--cat-surface)] px-3 py-2.5 text-sm leading-relaxed mc-pc-text outline-none transition duration-200 ease-in-out placeholder:text-[color-mix(in_srgb,var(--cat-muted)_65%,transparent)] focus:border-[color-mix(in_srgb,var(--cat-text)_18%,transparent)]'

  const innerFieldClass = clsx(fieldClass, 'mt-1.5')

  const resumenHint =
    totalCop > 0
      ? `Total ${formatCop(totalCop)} · ${totalPiezas} piezas`
      : `${totalPiezas} piezas · completá precios o cupón`

  const resumenList = (
    <ul className="divide-y mc-pc-border border-t border-b border-[color-mix(in_srgb,var(--cat-muted)_16%,var(--cat-surface)_84%)]">
      {lines.map((l) => (
        <li key={cartLineKey(l)} className="flex justify-between gap-5 py-2.5 first:pt-0 sm:gap-6">
          <span className="min-w-0 flex-1 pr-2 leading-snug sm:pr-4">
            <span className="block text-[13px] font-medium text-[var(--cat-text)]">{l.titulo}</span>
            <span className="mt-0.5 block text-[11px] tabular-nums text-[var(--cat-muted)]">
              × {l.cantidad}
              {l.precioUnitarioCop != null && l.precioUnitarioCop > 0 ? (
                <>
                  {' '}
                  · {formatCop(l.precioUnitarioCop)} c/u
                </>
              ) : null}
            </span>
          </span>
          <span className="shrink-0 self-start pt-0.5 text-[13px] font-semibold tabular-nums text-[var(--cat-text)]">
            {l.precioUnitarioCop != null && l.precioUnitarioCop > 0
              ? formatCop(l.precioUnitarioCop * l.cantidad)
              : '—'}
          </span>
        </li>
      ))}
      <li className="flex justify-between gap-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
          Subtotal
        </span>
        <span className="text-[13px] font-medium tabular-nums text-[color-mix(in_srgb,var(--cat-text)_82%,var(--cat-muted)_18%)]">
          {subtotalCop > 0 ? formatCop(subtotalCop) : '—'}
        </span>
      </li>
      {(lineaEnvio === 'cobro' ||
        lineaEnvio === 'cotizacion' ||
        lineaEnvio === 'gratis_umbral' ||
        lineaEnvio === 'gratis_ciudad') && (
        <li className="flex justify-between gap-4 py-2.5">
          <span className="leading-snug">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              {envioLabel}
            </span>
            {lineaEnvio === 'gratis_umbral' ? (
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-[var(--cat-muted)]">
                Subtotal igual o mayor al mínimo de tu tienda
              </span>
            ) : null}
            {lineaEnvio === 'cotizacion' && envioSeleccionada ? (
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-[var(--cat-muted)]">
                {envioSeleccionada.carrierLabel}
                {envioSeleccionada.deliveryEstimate
                  ? ` · ${envioSeleccionada.deliveryEstimate}`
                  : ''}
              </span>
            ) : null}
            {envioQuoteLoading ? (
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-[var(--cat-muted)]">
                Cotizando envío…
              </span>
            ) : null}
            {envioQuoteError ? (
              <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-amber-800">
                {envioQuoteError}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-[color-mix(in_srgb,var(--cat-text)_82%,var(--cat-muted)_18%)]">
            {envioQuoteLoading && lineaEnvio !== 'gratis_umbral' && lineaEnvio !== 'gratis_ciudad'
              ? '…'
              : lineaEnvio === 'cobro' || lineaEnvio === 'cotizacion'
                ? formatCop(envioCop)
                : 'Gratis'}
          </span>
        </li>
      )}
      {descuentoCop > 0 && (
        <li className="flex justify-between gap-4 py-2.5 text-emerald-800">
          <span className="text-[12px] font-medium">
            Descuento{cuponAplicado ? ` (${normalizeCuponCodigo(cuponAplicado.codigo)})` : ''}
          </span>
          <span className="text-[13px] font-semibold tabular-nums">−{formatCop(descuentoCop)}</span>
        </li>
      )}
      <li className="flex justify-between gap-4 border-t border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] py-3.5 pt-3">
        <span className="text-[15px] font-semibold tracking-tight text-[var(--cat-text)]">Total</span>
        <span className="text-[17px] font-bold tabular-nums tracking-tight text-[var(--cat-text)]">
          {totalCop > 0 ? formatCop(totalCop) : '—'}
        </span>
      </li>
    </ul>
  )

  const resumenCtaAccentClass =
    'inline-flex w-full items-center justify-center gap-2 mc-pc-btn bg-[var(--cat-accent)] px-4 py-3.5 text-sm font-semibold text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

  const navSecondaryClass =
    'mc-pc-btn border mc-pc-border bg-transparent px-4 py-3.5 text-sm font-semibold mc-pc-text transition duration-200 ease-in-out hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40'

  const isFinalStep = checkoutStep === 'envio'
  const currentStepIdx = checkoutStepIndex(checkoutStep)
  const stepMeta = CHECKOUT_STEP_META[checkoutStep]

  const finalPayDisabled =
    busy || onepayBusy || addiBusy || !preciosOk || subtotalCop <= 0 || envioQuoteLoading

  const payWithAddi =
    pagoMetodoCheckout === 'addi' || (mostrarAddiEnCheckout && !mostrarOnepayEnCheckout)

  const finalPayButton =
    pagoMetodoCheckout === 'contraentrega' ? (
      <button
        type="button"
        onClick={() => void pagarContraEntrega()}
        disabled={finalPayDisabled || busy}
        className={resumenCtaAccentClass}
      >
        {busy
          ? 'Confirmando…'
          : `Pedir y pagar al recibir · ${totalCop > 0 ? formatCop(totalCop) : '—'}`}
      </button>
    ) : payWithAddi ? (
      <button
        type="button"
        onClick={() => void pagarConAddi()}
        disabled={finalPayDisabled}
        className={resumenCtaAccentClass}
      >
        {addiBusy
          ? 'Abriendo Addi…'
          : `Pagar con Addi · ${totalCop > 0 ? formatCop(totalCop) : '—'}`}
      </button>
    ) : mostrarOnepayEnCheckout ? (
      <button
        type="button"
        onClick={() => void pagarConOnepay()}
        disabled={finalPayDisabled}
        className={resumenCtaAccentClass}
      >
        {onepayBusy ? 'Abriendo OnePay…' : `Pagar · ${totalCop > 0 ? formatCop(totalCop) : '—'}`}
      </button>
    ) : checkoutVentasModo === 'whatsapp' ? (
      <button
        type="button"
        onClick={pedirPorWhatsapp}
        disabled={finalPayDisabled}
        className={resumenCtaAccentClass}
      >
        <IconWhatsApp monochrome size={18} />
        Pedir por WhatsApp
      </button>
    ) : (
      <button
        type="submit"
        form="checkout-final-form"
        disabled={finalPayDisabled}
        className={resumenCtaAccentClass}
      >
        {busy ? 'Procesando…' : 'Confirmar pago simulado'}
      </button>
    )

  const stepNavButtons = (
    <div className="flex gap-3">
      {currentStepIdx > 0 ? (
        <button type="button" className={clsx(navSecondaryClass, 'flex-1')} onClick={goCheckoutBack}>
          Atrás
        </button>
      ) : null}
      {!isFinalStep ? (
        <button type="button" className={clsx(resumenCtaAccentClass, 'flex-1')} onClick={goCheckoutNext}>
          Continuar
        </button>
      ) : (
        <div className="min-w-0 flex-1">{finalPayButton}</div>
      )}
    </div>
  )

  const datosResumenCard =
    nombre.trim() || telefono.trim() || email.trim() ? (
      <div className="rounded-md border border-dashed mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] px-4 py-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--cat-muted)]">Tus datos</p>
        <dl className="mt-2 space-y-1 text-[13px] leading-snug mc-pc-text">
          {nombre.trim() ? (
            <div className="flex justify-between gap-3">
              <dt className="mc-pc-muted">Nombre</dt>
              <dd className="text-right font-medium">{nombre.trim()}</dd>
            </div>
          ) : null}
          {telefono.trim() ? (
            <div className="flex justify-between gap-3">
              <dt className="mc-pc-muted">Teléfono</dt>
              <dd className="text-right font-medium">{telefono.trim()}</dd>
            </div>
          ) : null}
          {email.trim() ? (
            <div className="flex justify-between gap-3">
              <dt className="mc-pc-muted">Correo</dt>
              <dd className="truncate text-right font-medium">{email.trim()}</dd>
            </div>
          ) : null}
        </dl>
        <button
          type="button"
          onClick={() => goToCheckoutStep('datos')}
          className="mt-2.5 text-[12px] font-medium mc-pc-text underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-2 hover:opacity-75"
        >
          Editar datos
        </button>
      </div>
    ) : null

  return (
    <div className="mc-public-catalog-inset pb-28 py-7 sm:py-9 lg:max-w-7xl lg:pb-9">
      <div className="mb-6 sm:mb-8">
        <nav className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] mc-pc-muted" aria-label="Checkout">
          <Link
            to={to('/')}
            className="font-medium text-[var(--cat-text)] transition hover:opacity-75"
          >
            Tienda
          </Link>
          <span className="text-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)]" aria-hidden>
            /
          </span>
          <span className="text-[var(--cat-text)]">Pago</span>
        </nav>
        <h1 className="mc-pc-display mt-2 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:mt-3 sm:text-3xl">
          {esRegalo ? 'Regalar' : 'Checkout'}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--cat-muted)] sm:mt-3">
          {esRegalo && giftWishlist
            ? `Vas a regalarle a ${giftWishlist.destinatarioNombre}. Vos pagás; el envío va a su dirección.`
            : mostrarOnepayEnCheckout
              ? 'Tres pasos rápidos: revisás el pedido, cargás tus datos y pagás con OnePay de forma segura.'
              : checkoutVentasModo === 'whatsapp'
                ? 'Completá el pedido paso a paso. Esta tienda coordina el pago por WhatsApp.'
                : 'Completá el pedido paso a paso. Cuando la tienda active la pasarela podrás pagar en línea.'}
        </p>
        {esRegalo && giftWishlist ? (
          <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--cat-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)] px-4 py-3 text-sm text-[var(--cat-text)]">
            <p className="font-semibold">{giftWishlist.titulo}</p>
            <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
              Entrega en {giftWishlist.envioCiudad}
              {giftWishlist.envioDepartamento ? `, ${giftWishlist.envioDepartamento}` : ''}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mb-6 sm:mb-8">
        <CheckoutStepIndicator current={checkoutStep} onStepClick={goToCheckoutStep} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-6">
        {tenantHasPoliticas(tenant) && (
          <Link
            to={to('/politicas')}
            className="text-sm font-medium text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-4 transition hover:opacity-80"
          >
            Políticas
          </Link>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-12">
        <div className="space-y-5 lg:col-span-7 lg:space-y-6">
          <div
            key={checkoutStep}
            className="mc-reg-step-animate rounded-2xl border mc-pc-border bg-[var(--cat-surface)] p-5 sm:p-6"
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.repeat || isFinalStep) return
              const t = e.target
              if (t instanceof HTMLTextAreaElement) return
              if (t instanceof HTMLButtonElement) return
              e.preventDefault()
              goCheckoutNext()
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cat-muted)]">
              Paso {currentStepIdx + 1} de {CHECKOUT_STEPS.length}
            </p>
            <h2 className="mc-pc-display mt-1.5 text-xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-2xl">
              {stepMeta.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--cat-muted)]">{stepMeta.subtitle}</p>

            <div className="mt-5 sm:mt-6">
              {checkoutStep === 'revisar' && (
                <div className="space-y-5">
                  {resumenList}
                  <div className="rounded-md border mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] p-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">Cupón de descuento</p>
                    <div className="mt-3 space-y-3">
                      {cuponAplicado ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm mc-pc-text">
                            Activo:{' '}
                            <span className="font-mono font-medium">
                              {normalizeCuponCodigo(cuponAplicado.codigo)}
                            </span>
                          </p>
                          <button
                            type="button"
                            className="text-sm font-medium mc-pc-muted underline decoration-neutral-300 underline-offset-4 hover:opacity-70"
                            onClick={quitarCupon}
                          >
                            Quitar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1">
                            <input
                              className={innerFieldClass}
                              value={cuponInput}
                              onChange={(e) => setCuponInput(e.target.value)}
                              placeholder="Código de descuento (opcional)"
                              autoComplete="off"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={aplicarCupon}
                            className="shrink-0 rounded-md border mc-pc-border bg-transparent px-4 py-2.5 text-sm font-medium mc-pc-text transition hover:opacity-80"
                          >
                            Aplicar
                          </button>
                        </div>
                      )}
                      {cuponError ? <p className="text-sm text-red-700">{cuponError}</p> : null}
                    </div>
                  </div>
                  {!preciosOk ? (
                    <p className="rounded-md border border-neutral-200/60 bg-neutral-50/80 px-4 py-3 text-sm leading-relaxed text-neutral-800">
                      Hay ítems sin precio. Volvé al catálogo o pedí por WhatsApp si la tienda aún no cargó precios.
                    </p>
                  ) : null}
                </div>
              )}

              {checkoutStep === 'datos' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                      Nombre <span className="text-red-700">*</span>
                    </label>
                    <input
                      className={innerFieldClass}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      autoComplete="name"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                      Teléfono <span className="text-red-700">*</span>
                    </label>
                    <input
                      className={innerFieldClass}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                      Correo <span className="text-red-700">*</span>
                    </label>
                    <input
                      className={innerFieldClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                    />
                    <p className="mt-1.5 text-[11px] leading-relaxed mc-pc-muted">
                      Te enviamos la confirmación del pedido y el seguimiento a este correo.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Tipo de documento <span className="text-red-700">*</span>
                      </label>
                      <select
                        className={innerFieldClass}
                        value={clienteTipoDocumento}
                        onChange={(e) => setClienteTipoDocumento(e.target.value)}
                      >
                        <option value="">Elegí…</option>
                        {MC_CHECKOUT_DOCUMENTO_TIPOS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Número de documento <span className="text-red-700">*</span>
                      </label>
                      <input
                        className={innerFieldClass}
                        value={clienteDocumentoNumero}
                        onChange={(e) => setClienteDocumentoNumero(e.target.value)}
                        inputMode="text"
                        autoComplete="off"
                        minLength={5}
                        placeholder="Sin puntos ni espacios"
                      />
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === 'envio' && (
                <form id="checkout-final-form" onSubmit={(e) => void pagarSimulado(e)} className="space-y-5">
                  {datosResumenCard}
                  {esRegalo ? (
                    <p className="rounded-md border border-dashed mc-pc-border px-3 py-2.5 text-[12px] leading-relaxed mc-pc-muted">
                      La dirección de envío viene de la lista de regalos y no se puede cambiar (así llega a quien
                      corresponde).
                    </p>
                  ) : null}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Departamento <span className="text-red-700">*</span>
                      </label>
                      <select
                        className={innerFieldClass}
                        value={envioDepartamento}
                        disabled={esRegalo || busy || onepayBusy}
                        onChange={(e) => {
                          const v = e.target.value
                          setEnvioDepartamento(v)
                          if (!ciudadManual) setEnvioCiudad('')
                        }}
                      >
                        <option value="">Elegí departamento…</option>
                        {COLOMBIA_DEPARTAMENTOS.map((d) => (
                          <option key={d} value={d}>
                            {formatoDepartamentoEtiqueta(d)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Ciudad o municipio <span className="text-red-700">*</span>
                      </label>
                      {ciudadManual ? (
                        <input
                          className={innerFieldClass}
                          value={envioCiudad}
                          onChange={(e) => setEnvioCiudad(e.target.value)}
                          autoComplete="address-level2"
                          placeholder="Ej. nombre del municipio"
                          disabled={esRegalo || busy || onepayBusy}
                        />
                      ) : (
                        <MunicipioCombobox
                          departamento={envioDepartamento}
                          value={envioCiudad}
                          onChange={setEnvioCiudad}
                          disabled={esRegalo || busy || onepayBusy}
                          inputClassName={innerFieldClass}
                          placeholder="Buscá y elegí tu municipio…"
                        />
                      )}
                      {!ciudadManual ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed mc-pc-muted">
                          El envío se calcula con la ciudad indicada y las tarifas de la tienda.
                        </p>
                      ) : null}
                    </div>
                    {!esRegalo ? (
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-dashed mc-pc-border px-3 py-2.5">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={ciudadManual}
                          onChange={(e) => {
                            const v = e.target.checked
                            setCiudadManual(v)
                            if (!v) setEnvioCiudad('')
                          }}
                        />
                        <span className="text-[13px] leading-snug mc-pc-text">
                          Mi ciudad no aparece en la lista (escribir manualmente)
                        </span>
                      </label>
                    ) : null}
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Dirección <span className="text-red-700">*</span>
                      </label>
                      <textarea
                        className={clsx(innerFieldClass, 'min-h-[72px] resize-y')}
                        value={envioDireccion}
                        onChange={(e) => setEnvioDireccion(e.target.value)}
                        autoComplete="street-address"
                        disabled={esRegalo || busy || onepayBusy}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Referencia (opcional)
                      </label>
                      <input
                        className={innerFieldClass}
                        disabled={esRegalo || busy || onepayBusy || addiBusy}
                        value={envioReferencia}
                        onChange={(e) => setEnvioReferencia(e.target.value)}
                        placeholder="Torre, apartamento, barrio…"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                        Nota para la tienda (opcional)
                      </label>
                      <textarea
                        className={clsx(innerFieldClass, 'min-h-[72px] resize-y')}
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                        placeholder="Instrucciones especiales, horario de entrega…"
                      />
                    </div>
                  </div>
                  {mostrarSelectorMetodoPago ? (
                    <div className="space-y-2 rounded-xl border mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] p-3 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mc-pc-muted">
                        Cómo querés pagar
                      </p>
                      <div className="grid gap-2">
                        {mostrarOnepayEnCheckout || (!mostrarAddiEnCheckout && !contraentregaDisponible) ? (
                          <button
                            type="button"
                            className={clsx(
                              'rounded-xl border px-3 py-3 text-left transition',
                              pagoMetodoCheckout === 'default'
                                ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)]'
                                : 'border-transparent bg-[var(--cat-surface)]',
                            )}
                            onClick={() => setPagoMetodoCheckout('default')}
                          >
                            <span className="block text-[14px] font-semibold mc-pc-text">
                              {mostrarOnepayEnCheckout
                                ? 'Pagar ahora (OnePay)'
                                : checkoutVentasModo === 'whatsapp'
                                  ? 'Coordinar por WhatsApp'
                                  : 'Pago en línea / simulado'}
                            </span>
                            <span className="mt-0.5 block text-[12px] mc-pc-muted">
                              {mostrarOnepayEnCheckout
                                ? 'Tarjeta, Nequi, PSE y más'
                                : 'Confirmás con la tienda antes del envío'}
                            </span>
                          </button>
                        ) : null}
                        {mostrarAddiEnCheckout ? (
                          <button
                            type="button"
                            className={clsx(
                              'rounded-xl border px-3 py-3 text-left transition',
                              pagoMetodoCheckout === 'addi' ||
                                (!mostrarOnepayEnCheckout && pagoMetodoCheckout === 'default')
                                ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)]'
                                : 'border-transparent bg-[var(--cat-surface)]',
                            )}
                            onClick={() => setPagoMetodoCheckout(mostrarOnepayEnCheckout ? 'addi' : 'default')}
                          >
                            <span className="block text-[14px] font-semibold mc-pc-text">
                              Pagar con Addi
                            </span>
                            <span className="mt-0.5 block text-[12px] mc-pc-muted">
                              Cuotas sin tarjeta · con tu cédula
                            </span>
                          </button>
                        ) : null}
                        {contraentregaDisponible ? (
                          <button
                            type="button"
                            className={clsx(
                              'rounded-xl border px-3 py-3 text-left transition',
                              pagoMetodoCheckout === 'contraentrega'
                                ? 'border-[var(--cat-accent)] bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)]'
                                : 'border-transparent bg-[var(--cat-surface)]',
                            )}
                            onClick={() => setPagoMetodoCheckout('contraentrega')}
                          >
                            <span className="block text-[14px] font-semibold mc-pc-text">
                              Pagar al recibir
                            </span>
                            <span className="mt-0.5 block text-[12px] mc-pc-muted">
                              Contraentrega · pagás {totalCop > 0 ? formatCop(totalCop) : 'el total'} al mensajero
                            </span>
                          </button>
                        ) : null}
                      </div>
                      {pagoMetodoCheckout === 'contraentrega' ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-950">
                          Tené el dinero listo. Si no hay nadie para recibir, el pedido puede devolverse y se cancela el
                          cobro.
                        </p>
                      ) : null}
                    </div>
                  ) : mostrarAddiEnCheckout && !mostrarOnepayEnCheckout ? (
                    <div className="rounded-xl border mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] px-3 py-3 sm:px-4">
                      <p className="text-[14px] font-semibold mc-pc-text">Pagar con Addi</p>
                      <p className="mt-0.5 text-[12px] mc-pc-muted">Cuotas sin tarjeta · con tu cédula</p>
                    </div>
                  ) : null}
                  {!mostrarOnepayEnCheckout &&
                  checkoutVentasModo !== 'whatsapp' &&
                  pagoMetodoCheckout !== 'contraentrega' ? (
                    <div className="rounded-md border border-dashed mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] px-3 py-4 sm:px-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] mc-pc-muted">Pago simulado</p>
                      <p className="mt-2 text-[12px] leading-relaxed mc-pc-muted">
                        Modo demostración: no se cobra de verdad. Con OnePay activo, el cobro real se abre en una ventana
                        segura.
                      </p>
                    </div>
                  ) : null}
                </form>
              )}
            </div>

            {errMsg ? <p className="mt-4 text-sm leading-relaxed text-red-700">{errMsg}</p> : null}

            <div className="mt-6 hidden lg:block">{stepNavButtons}</div>
          </div>
        </div>

        <aside className="hidden lg:col-span-5 lg:block" aria-label="Resumen del pedido">
          <div className="mc-pc-rey-card sticky top-24 rounded-2xl p-5 xl:top-28 xl:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cat-muted)]">Resumen</p>
            <h2 className="mc-pc-display mt-1.5 text-lg font-semibold text-[var(--cat-text)]">Tu pedido</h2>
            <p className="mt-1 text-xs text-[var(--cat-muted)]">{resumenHint}</p>
            <div className="mt-4">{resumenList}</div>
            {checkoutStep !== 'revisar' && envioDepartamento.trim() && envioCiudad.trim() ? (
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--cat-muted)]">
                Envío a {envioCiudad.trim()}, {formatoDepartamentoEtiqueta(envioDepartamento.trim())}
              </p>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-[var(--cat-muted)]">
              {isFinalStep ? 'Revisá el total antes de confirmar.' : 'El envío se actualiza al completar la dirección.'}
            </p>
            {isFinalStep ? <div className="mt-4">{finalPayButton}</div> : null}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t mc-pc-border bg-[color-mix(in_srgb,var(--cat-surface)_92%,transparent)] px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-lg space-y-2">
          {isFinalStep ? (
            <div className="flex items-center justify-between gap-3 px-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">Total</span>
              <span className="text-lg font-bold tabular-nums text-[var(--cat-text)]">
                {totalCop > 0 ? formatCop(totalCop) : '—'}
              </span>
            </div>
          ) : null}
          {stepNavButtons}
        </div>
      </div>
    </div>
  )
}
