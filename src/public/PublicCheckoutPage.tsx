import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import { resolveEnvioCop, effectiveEnvioPricingForCheckout } from '@/lib/checkoutShipping'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import type { McCuponTienda, McOrdenCatalogoLinea } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'
import { tenantHasPoliticas } from '@/lib/tenantPoliticas'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import { COLOMBIA_DEPARTAMENTOS, formatoDepartamentoEtiqueta, MC_CHECKOUT_DOCUMENTO_TIPOS } from '@/lib/colombiaGeo'
import { buildCheckoutWhatsappText, whatsappUrlFromNumber } from '@/catalog-local/buildWhatsappUrl'
import { buildNumeroReferencia, publicCatalogSuccessPath } from '@/lib/catalogOrderTracking'
import { markCarritoIniciadoOnOrderComplete } from '@/lib/markCarritoIniciadoOnOrder'
import { useCarritoIniciadoCheckoutSync } from '@/hooks/useCarritoIniciadoCheckoutSync'
import {
  MC_ONEPAY_DONE_MSG,
  MC_ONEPAY_POPUP_NAME,
  publicCatalogOnePayReturnPath,
} from '@/public/onepayCheckoutPaths'

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

function CheckoutDisclosure({
  title,
  hint,
  initialOpen = false,
  open: openControlled,
  onOpenChange,
  children,
}: {
  title: string
  hint?: string
  /** Estado inicial si no hay control externo. */
  initialOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen)
  const controlled = openControlled !== undefined
  const open = controlled ? openControlled : uncontrolledOpen

  function setOpen(next: boolean) {
    if (controlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
  }

  return (
    <details
      className="mc-checkout-panel rounded-md border mc-pc-border bg-[var(--cat-surface)]"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[color-mix(in_srgb,var(--cat-bg)_55%,var(--cat-surface)_45%)] sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium tracking-tight mc-pc-text">{title}</p>
          {hint ? <p className="mt-1 text-[12px] leading-relaxed mc-pc-muted">{hint}</p> : null}
        </div>
        <span
          className="mc-checkout-chevron mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border mc-pc-border text-[11px] mc-pc-muted"
          aria-hidden
        >
          ▼
        </span>
      </summary>
      <div className="border-t mc-pc-border px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">{children}</div>
    </details>
  )
}

function CheckoutCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border mc-pc-border bg-[var(--cat-surface)]">
      <div className="border-b mc-pc-border px-4 py-3 sm:px-5 sm:py-3.5">
        <p className="text-[15px] font-medium tracking-tight mc-pc-text">{title}</p>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </div>
  )
}

export function PublicCheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tenantId, tenant, platformSettings, loading, error } = usePublicTenant(slug)
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
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [cuponOpen, setCuponOpen] = useState(false)

  /** Links antiguos de OnePay que apuntaban a `/checkout?onepay=1`: redirect a la vista dedicada. */
  useEffect(() => {
    if (!slug) return
    if (searchParams.get('onepay') !== '1') return
    const o = searchParams.get('o')
    const ov = searchParams.get('ov')
    if (!o || !ov) return
    navigate(publicCatalogOnePayReturnPath(slug, o, ov), { replace: true })
  }, [slug, searchParams, navigate])

  /** Popup OnePay: la pestaña principal recibe la URL de validación y navega ahí. */
  useEffect(() => {
    function onWinMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return
      const d = e.data as { type?: string; pathname?: string; search?: string }
      if (d?.type !== MC_ONEPAY_DONE_MSG || typeof d.pathname !== 'string') return
      const expectedPath = slug ? `/c/${slug}/checkout/pago-validando` : null
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

  const { lineasOrden, subtotalCop, preciosOk } = useMemo(() => {
    const lineas: McOrdenCatalogoLinea[] = lines.map((l) => ({
      productId: l.productId,
      nombre: l.titulo,
      cantidad: l.cantidad,
      precioUnitarioCop: Math.max(0, Math.round(l.precioUnitarioCop ?? 0)),
    }))
    const t = lineas.reduce((s, x) => s + x.precioUnitarioCop * x.cantidad, 0)
    const ok = lineas.every((x) => x.precioUnitarioCop > 0)
    return { lineasOrden: lineas, subtotalCop: t, preciosOk: ok }
  }, [lines])

  const envioPricingInput = useMemo(
    () => effectiveEnvioPricingForCheckout(tenant ?? undefined, platformSettings ?? undefined),
    [
      tenant?.envioEstimadoCop,
      tenant?.envioPorCiudad,
      tenant?.envioGratisDesdeCop,
      tenant?.envioUsarTarifasMicatalogo,
      platformSettings?.envioMicatalogoEstimadoCop,
      platformSettings?.envioMicatalogoPorCiudad,
    ],
  )

  const { envioCop, lineaEnvio } = useMemo(
    () => resolveEnvioCop(envioPricingInput, envioCiudad, subtotalCop, envioDepartamento),
    [envioPricingInput, envioCiudad, envioDepartamento, subtotalCop],
  )

  const envioLabel = tenant?.envioEstimadoEtiqueta?.trim() || 'Envío'

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
    setCuponOpen(true)
  }

  function quitarCupon() {
    setCuponAplicado(null)
    setCuponInput('')
    setCuponError(null)
  }

  async function pagarSimulado(e: React.FormEvent) {
    e.preventDefault()
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
    if (!nombre.trim() || !telefono.trim()) {
      setErrMsg('Nombre y teléfono son obligatorios.')
      return
    }
    if (!envioDepartamento.trim()) {
      setErrMsg('Seleccioná el departamento de envío.')
      return
    }
    if (!envioCiudad.trim() || !envioDireccion.trim()) {
      setErrMsg('Ciudad y dirección de envío son obligatorias.')
      return
    }
    if (!clienteTipoDocumento.trim() || !clienteDocumentoNumero.trim()) {
      setErrMsg('Tipo y número de documento son obligatorios.')
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
      const base: Record<string, unknown> = {
        createdAt: now,
        updatedAt: now,
        estado: 'pagado',
        lineas: lineasOrden,
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
      if (email.trim()) base.clienteEmail = email.trim()
      base.clienteTipoDocumento = clienteTipoDocumento.trim().toUpperCase()
      base.clienteDocumentoNumero = clienteDocumentoNumero.trim()
      if (nota.trim()) base.notaCliente = nota.trim()
      if (envioCiudad.trim()) base.envioCiudad = envioCiudad.trim()
      if (envioDepartamento.trim()) base.envioDepartamento = envioDepartamento.trim()
      if (envioDireccion.trim()) base.envioDireccion = envioDireccion.trim()
      if (envioReferencia.trim()) base.envioReferencia = envioReferencia.trim()
      if (cuponVigente) base.cuponCodigo = normalizeCuponCodigo(cuponVigente.codigo)
      if (carritoIniciadoId) base.carritoIniciadoId = carritoIniciadoId

      await setDoc(orderRef, base)
      await markCarritoIniciadoOnOrderComplete({
        tenantId,
        slug,
        carritoIniciadoId,
        orderId: orderRef.id,
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
      })
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
    if (!nombre.trim() || !telefono.trim()) {
      setErrMsg('Nombre y teléfono son obligatorios.')
      return
    }
    if (!envioDepartamento.trim()) {
      setErrMsg('Seleccioná el departamento de envío.')
      return
    }
    if (!envioCiudad.trim() || !envioDireccion.trim()) {
      setErrMsg('Ciudad y dirección de envío son obligatorias.')
      return
    }
    if (!clienteTipoDocumento.trim() || !clienteDocumentoNumero.trim()) {
      setErrMsg('Tipo y número de documento son obligatorios.')
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
      email: email.trim() || undefined,
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
    if (!nombre.trim() || !telefono.trim()) {
      setErrMsg('Nombre y teléfono son obligatorios.')
      return
    }
    if (!envioDepartamento.trim()) {
      setErrMsg('Seleccioná el departamento de envío.')
      return
    }
    if (!envioCiudad.trim() || !envioDireccion.trim()) {
      setErrMsg('Ciudad y dirección de envío son obligatorias.')
      return
    }
    if (!clienteTipoDocumento.trim() || !clienteDocumentoNumero.trim()) {
      setErrMsg('Tipo y número de documento son obligatorios.')
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
        lineas: lines.map((l) => ({ productId: l.productId, cantidad: l.cantidad })),
        cuponCodigo: cuponVigente ? cuponVigente.codigo : undefined,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim() || undefined,
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

  if (!slug) return null

  if (loading) {
    return (
      <div className="mc-public-catalog-inset py-16 text-center text-sm leading-relaxed mc-pc-muted">Cargando…</div>
    )
  }

  if (error || !tenantId || !tenant) {
    return (
      <div className="mc-public-catalog-inset py-16 text-center text-sm leading-relaxed mc-pc-muted">
        {error ?? 'Catálogo no disponible.'}
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="mc-public-catalog-inset max-w-lg space-y-6 py-12">
        <p className="text-sm leading-relaxed mc-pc-text">No hay productos en el carrito.</p>
        <Link
          to={`/c/${slug}`}
          className="inline-block text-sm font-medium mc-pc-text underline decoration-neutral-300 underline-offset-4 transition duration-200 ease-in-out hover:opacity-65"
        >
          Volver al catálogo
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
          to={`/c/${slug}`}
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

  const envioHint =
    envioDepartamento.trim() && envioCiudad.trim() && envioDireccion.trim()
      ? `${formatoDepartamentoEtiqueta(envioDepartamento.trim())} · ${envioCiudad.trim()} · listo`
      : envioDepartamento.trim() && envioCiudad.trim()
        ? `${formatoDepartamentoEtiqueta(envioDepartamento.trim())} · ${envioCiudad.trim()} · falta dirección`
        : 'Departamento, ciudad/municipio y dirección'

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
      {(lineaEnvio === 'cobro' || lineaEnvio === 'gratis_umbral' || lineaEnvio === 'gratis_ciudad') && (
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
          </span>
          <span className="shrink-0 text-[13px] font-medium tabular-nums text-[color-mix(in_srgb,var(--cat-text)_82%,var(--cat-muted)_18%)]">
            {lineaEnvio === 'cobro' ? formatCop(envioCop) : 'Gratis'}
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
    'mt-3 w-full rounded-full bg-[var(--cat-accent)] px-4 py-3.5 text-sm font-semibold text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

  const onepayResumenCta = mostrarOnepayEnCheckout ? (
    <>
      {errMsg ? <p className="mt-3 text-sm leading-relaxed text-red-700">{errMsg}</p> : null}
      <button
        type="button"
        onClick={() => void pagarConOnepay()}
        disabled={onepayBusy || busy || !preciosOk || subtotalCop <= 0}
        className={resumenCtaAccentClass}
      >
        {onepayBusy ? 'Abriendo OnePay…' : `Pagar · ${totalCop > 0 ? formatCop(totalCop) : '—'}`}
      </button>
    </>
  ) : null

  const whatsappResumenCta =
    checkoutVentasModo === 'whatsapp' ? (
      <>
        {errMsg ? <p className="mt-3 text-sm leading-relaxed text-red-700">{errMsg}</p> : null}
        <button
          type="button"
          onClick={pedirPorWhatsapp}
          disabled={busy || onepayBusy || !preciosOk || subtotalCop <= 0}
          className={resumenCtaAccentClass}
        >
          Pedir por Whatsapp
        </button>
      </>
    ) : null

  const resumenCta = onepayResumenCta ?? whatsappResumenCta

  return (
    <div className="mc-public-catalog-inset py-7 sm:py-9 lg:max-w-7xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] mc-pc-muted" aria-label="Checkout">
            <Link
              to={`/c/${slug}`}
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
            Checkout
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--cat-muted)] sm:mt-3">
            {mostrarOnepayEnCheckout
              ? 'Completá tus datos; en el resumen del pedido tenés el total y el botón para abrir el cobro seguro de OnePay.'
              : checkoutVentasModo === 'whatsapp'
                ? 'Completá tus datos para registrar el pedido. Esta tienda coordina el pago por WhatsApp.'
                : 'Completá tus datos; cuando la tienda active la pasarela podrás pagar en línea.'}
          </p>
        </div>
        <ol className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cat-muted)] sm:gap-2 sm:text-[11px]">
          <li className="text-[var(--cat-text)]">1 · Revisar</li>
          <li aria-hidden>·</li>
          <li>2 · Datos</li>
          <li aria-hidden>·</li>
          <li>3 · Pago</li>
        </ol>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-6">
        {tenantHasPoliticas(tenant) && (
          <Link
            to={`/c/${slug}/politicas`}
            className="text-sm font-medium text-[var(--cat-text)] underline decoration-[color-mix(in_srgb,var(--cat-muted)_45%,transparent)] underline-offset-4 transition hover:opacity-80"
          >
            Políticas
          </Link>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-12">
        <div className="space-y-5 lg:col-span-7 lg:space-y-6">
          <div className="lg:hidden">
            <CheckoutDisclosure title="Resumen del pedido" hint={resumenHint} initialOpen>
              {resumenList}
              <p className="mt-4 text-xs leading-relaxed text-[var(--cat-muted)]">
                Cupón y envío se reflejan en el total.
              </p>
              {resumenCta}
            </CheckoutDisclosure>
          </div>

      <CheckoutDisclosure
        title="Cupón de descuento"
        hint={cuponAplicado ? `Aplicado: ${normalizeCuponCodigo(cuponAplicado.codigo)}` : 'Opcional · tocá para ingresar código'}
        open={cuponOpen}
        onOpenChange={setCuponOpen}
      >
        <div className="space-y-3">
          {cuponAplicado ? (
            <div className="flex flex-col gap-2 rounded-md border mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_40%,var(--cat-surface)_60%)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm mc-pc-text">
                Activo: <span className="font-mono font-medium">{normalizeCuponCodigo(cuponAplicado.codigo)}</span>
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
                  placeholder="Código de descuento"
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
          {cuponError && <p className="text-sm text-red-700">{cuponError}</p>}
        </div>
      </CheckoutDisclosure>

      {!preciosOk && (
        <p className="rounded-md border border-neutral-200/60 bg-neutral-50/80 px-4 py-3 text-sm leading-relaxed text-neutral-800">
          Hay ítems sin precio. Volvé al catálogo o pedí por WhatsApp si la tienda aún no cargó precios.
        </p>
      )}

      <form onSubmit={(e) => void pagarSimulado(e)} className="space-y-5 sm:space-y-6">
        <CheckoutCard title="Tus datos">
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
                required
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
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                Correo (opcional)
              </label>
              <input
                className={innerFieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
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
                  required
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
                  required
                  minLength={5}
                  placeholder="Sin puntos ni espacios"
                />
              </div>
            </div>
          </div>
        </CheckoutCard>

        <CheckoutDisclosure title="Envío" hint={envioHint}>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                Departamento <span className="text-red-700">*</span>
              </label>
              <select
                className={innerFieldClass}
                value={envioDepartamento}
                required
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
                  required
                  placeholder="Ej. nombre del municipio"
                />
              ) : (
                <MunicipioCombobox
                  departamento={envioDepartamento}
                  value={envioCiudad}
                  onChange={setEnvioCiudad}
                  disabled={busy || onepayBusy}
                  required
                  inputClassName={innerFieldClass}
                  placeholder="Buscá y elegí tu municipio…"
                />
              )}
              {!ciudadManual && (
                <p className="mt-1.5 text-[11px] leading-relaxed mc-pc-muted">
                  Escribí las primeras letras para filtrar. El envío se calcula con la ciudad indicada y las tarifas de la
                  tienda (o Mi Catálogo si la tienda lo configuró).
                </p>
              )}
            </div>

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

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                Dirección <span className="text-red-700">*</span>
              </label>
              <textarea
                className={clsx(innerFieldClass, 'min-h-[72px] resize-y')}
                value={envioDireccion}
                onChange={(e) => setEnvioDireccion(e.target.value)}
                autoComplete="street-address"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mc-pc-muted">
                Referencia (opcional)
              </label>
              <input
                className={innerFieldClass}
                value={envioReferencia}
                onChange={(e) => setEnvioReferencia(e.target.value)}
                placeholder="Torre, apartamento, barrio…"
              />
            </div>
          </div>
        </CheckoutDisclosure>

        <CheckoutDisclosure
          title="Nota para la tienda"
          hint={nota.trim() ? 'Hay un mensaje cargado' : 'Opcional'}
        >
          <label className="sr-only" htmlFor="checkout-nota">
            Nota para la tienda
          </label>
          <textarea
            id="checkout-nota"
            className={clsx(innerFieldClass, 'min-h-[88px] resize-y')}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </CheckoutDisclosure>

        {!mostrarOnepayEnCheckout && checkoutVentasModo !== 'whatsapp' && (
          <CheckoutDisclosure
            title="Pago"
            hint="Tarjeta de demostración · no se cobra de verdad"
          >
            <div className="rounded-md border border-dashed mc-pc-border bg-[color-mix(in_srgb,var(--cat-bg)_35%,var(--cat-surface)_65%)] px-3 py-4 sm:px-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] mc-pc-muted">Tarjeta (demo)</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border mc-pc-border bg-[var(--cat-surface)] px-3 py-2 text-sm mc-pc-muted"
                  placeholder="Número"
                  disabled
                  value="4242 4242 4242 4242"
                  readOnly
                />
                <input
                  className="rounded-md border mc-pc-border bg-[var(--cat-surface)] px-3 py-2 text-sm mc-pc-muted"
                  placeholder="MM/AA"
                  disabled
                  readOnly
                />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed mc-pc-muted">
                Simulación: los datos no van a una pasarela. Si la tienda tiene OnePay, el pago real es solo en la página
                que se abre con el botón de pago del resumen.
              </p>
            </div>
          </CheckoutDisclosure>
        )}

        {!mostrarOnepayEnCheckout && checkoutVentasModo !== 'whatsapp' && errMsg ? (
          <p className="text-sm leading-relaxed text-red-700">{errMsg}</p>
        ) : null}

        {!mostrarOnepayEnCheckout && checkoutVentasModo !== 'whatsapp' ? (
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={busy || onepayBusy || !preciosOk || subtotalCop <= 0}
              className="w-full rounded-full bg-[var(--cat-accent)] px-4 py-3.5 text-sm font-semibold text-[var(--cat-accent-text)] transition duration-200 ease-in-out hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? 'Procesando…' : 'Confirmar pago simulado'}
            </button>
          </div>
        ) : null}
      </form>
        </div>

        <aside className="hidden lg:col-span-5 lg:block" aria-label="Resumen del pedido">
          <div className="mc-pc-rey-card sticky top-24 rounded-2xl p-5 xl:top-28 xl:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cat-muted)]">Resumen</p>
            <h2 className="mc-pc-display mt-1.5 text-lg font-semibold text-[var(--cat-text)]">Tu pedido</h2>
            <p className="mt-1 text-xs text-[var(--cat-muted)]">{resumenHint}</p>
            <div className="mt-4">{resumenList}</div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--cat-muted)]">
              Cupón y envío se reflejan en el total.
            </p>
            {resumenCta}
          </div>
        </aside>
      </div>
    </div>
  )
}
