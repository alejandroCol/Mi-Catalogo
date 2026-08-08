import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { firebaseConfigured, getFirebaseFunctions } from '@/lib/firebase'
import { publicCatalogSuccessPath } from '@/lib/catalogOrderTracking'
import { MC_ONEPAY_DONE_MSG, publicCatalogOnePayReturnPath } from '@/public/onepayCheckoutPaths'
import { MC_ADDI_DONE_MSG, publicCatalogAddiReturnPath } from '@/public/addiCheckoutPaths'

import { usePublicStore } from '@/public/PublicStoreContext'

const relayedMcOnePayPopupKeys = new Set<string>()
const relayedMcAddiPopupKeys = new Set<string>()

export function PublicCheckoutPagoValidandoPage() {
  const { slug, to } = usePublicStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const onePayReturn = searchParams.get('onepay') === '1'
  const addiReturn = searchParams.get('addi') === '1'
  const orderId = searchParams.get('o')
  const viewToken = searchParams.get('ov')
  const { clear } = useCatalogoSimpleCart()

  const [returnStatus, setReturnStatus] = useState<
    'idle' | 'checking' | 'pagado' | 'pendiente' | 'cancelado' | 'error' | 'legacy'
  >('idle')

  const providerLabel = addiReturn ? 'Addi' : 'OnePay'
  const isReturn = onePayReturn || addiReturn

  /** Popup: devolver la URL de validación al checkout principal y cerrar esta ventana. */
  useEffect(() => {
    if (!isReturn) return
    if (!slug || !orderId || !viewToken || typeof window === 'undefined') return
    const opener = window.opener as Window | null
    if (!opener || opener.closed) return
    try {
      const dedupeKey = `${addiReturn ? 'addi' : 'onepay'}:${orderId}:${viewToken}`
      const relaySet = addiReturn ? relayedMcAddiPopupKeys : relayedMcOnePayPopupKeys
      try {
        if (typeof sessionStorage !== 'undefined') {
          const sk = `mc_pay_popup_relay_v1:${dedupeKey}`
          if (sessionStorage.getItem(sk)) return
          sessionStorage.setItem(sk, '1')
        }
      } catch {
        /* */
      }
      if (relaySet.has(dedupeKey)) return
      relaySet.add(dedupeKey)

      const path = addiReturn
        ? publicCatalogAddiReturnPath(slug, orderId, viewToken)
        : publicCatalogOnePayReturnPath(slug, orderId, viewToken)
      const u = new URL(path, window.location.origin)
      opener.postMessage(
        {
          type: addiReturn ? MC_ADDI_DONE_MSG : MC_ONEPAY_DONE_MSG,
          pathname: u.pathname,
          search: u.search,
        },
        window.location.origin,
      )
      queueMicrotask(() => {
        try {
          window.close()
        } catch {
          /* */
        }
      })
    } catch {
      /* */
    }
  }, [isReturn, addiReturn, slug, orderId, viewToken])

  useEffect(() => {
    if (!isReturn) {
      setReturnStatus('idle')
      return
    }
    if (!orderId || !viewToken || !slug || !firebaseConfigured) {
      setReturnStatus('legacy')
      return
    }
    setReturnStatus('checking')
    const fnName = addiReturn ? 'mcAddiCheckoutStatus' : 'mcOnepayCheckoutStatus'
    const fn = httpsCallable(getFirebaseFunctions(), fnName)
    let n = 0
    const max = 20
    let t: ReturnType<typeof setInterval> | null = null
    const run = () => {
      void (async () => {
        try {
          const payload = addiReturn
            ? { slug, orderId, addiViewToken: viewToken }
            : { slug, orderId, onepayViewToken: viewToken }
          const r = await fn(payload)
          const d = r.data as { notFound?: boolean; estado?: string }
          if (d?.notFound) {
            if (t) clearInterval(t)
            setReturnStatus('error')
            return
          }
          if (d.estado === 'pagado') {
            if (t) clearInterval(t)
            setReturnStatus('pagado')
            clear()
            navigate(publicCatalogSuccessPath(slug, orderId), { replace: true })
            return
          }
          if (d.estado === 'cancelado') {
            if (t) clearInterval(t)
            setReturnStatus('cancelado')
            return
          }
          n += 1
          if (n >= max) {
            if (t) clearInterval(t)
            setReturnStatus('pendiente')
          } else {
            setReturnStatus('pendiente')
          }
        } catch {
          if (t) clearInterval(t)
          setReturnStatus('error')
        }
      })()
    }
    run()
    t = setInterval(run, 2500)
    return () => {
      if (t) clearInterval(t)
    }
  }, [isReturn, addiReturn, orderId, viewToken, slug, clear, navigate])

  if (!slug) return null

  return (
    <div className="mc-public-catalog-inset max-w-lg py-12 sm:py-16">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] sm:text-[13px] mc-pc-muted" aria-label="Validación">
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
          Tienda
        </Link>
        <span className="text-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)]" aria-hidden>
          /
        </span>
        <Link to={to('/checkout')} className="font-medium text-[var(--cat-text)] transition hover:opacity-75">
          Checkout
        </Link>
        <span className="text-[color-mix(in_srgb,var(--cat-muted)_55%,transparent)]" aria-hidden>
          /
        </span>
        <span className="text-[var(--cat-text)]">Pago</span>
      </nav>
      <h1 className="mc-pc-display mt-4 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
        Validando pago
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--cat-muted)]">
        Esta pantalla confirma con la tienda que {providerLabel} acreditó el cobro. Suele tardar unos segundos; no cerrés
        la pestaña si querés ver el resultado al instante.
      </p>

      {!isReturn && (
        <p className="mt-8 text-sm leading-relaxed mc-pc-muted">
          Abrí el pago desde el checkout de esta tienda. Si llegaste acá sin pagar,{' '}
          <Link to={to('/checkout')} className="font-medium text-[var(--cat-text)] underline underline-offset-4">
            volvé al checkout
          </Link>
          .
        </p>
      )}

      {isReturn && returnStatus === 'legacy' && (
        <p className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_50%,var(--cat-surface)_50%)] px-4 py-3 text-sm leading-relaxed text-[var(--cat-text)] sm:px-5">
          Volviste desde {providerLabel} sin datos completos de seguimiento. Si ya pagaste, la tienda verá el cobro en su
          panel cuando se confirme.
        </p>
      )}
      {isReturn && orderId && viewToken && returnStatus === 'checking' && (
        <p className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_50%,var(--cat-surface)_50%)] px-4 py-3 text-sm leading-relaxed text-[var(--cat-text)] sm:px-5">
          Comprobando el pago con la tienda…
        </p>
      )}
      {isReturn && orderId && viewToken && returnStatus === 'pendiente' && (
        <p className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 sm:px-5">
          El pago aún se está acreditando. Cuando {providerLabel} lo confirme, la venta quedará como “Pagada”. Podés
          esperar aquí o volver al catálogo; no se vuelve a cobrar.
        </p>
      )}
      {isReturn && orderId && viewToken && returnStatus === 'cancelado' && (
        <p className="mt-8 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm leading-relaxed text-red-950 sm:px-5">
          El cobro no se completó o venció.{' '}
          <Link to={to('/checkout')} className="font-semibold underline underline-offset-4">
            Volvé al checkout
          </Link>{' '}
          para intentar de nuevo.
        </p>
      )}
      {isReturn && orderId && viewToken && returnStatus === 'error' && (
        <p className="mt-8 rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm leading-relaxed text-red-950 sm:px-5">
          No pudimos consultar el estado del pedido. Si ya pagaste, la tienda lo verá en Pedidos al confirmarse con{' '}
          {providerLabel}.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to={to('/')}
          className="inline-flex items-center justify-center rounded-full border mc-pc-border bg-transparent px-4 py-2.5 text-sm font-medium mc-pc-text transition hover:opacity-80"
        >
          Ir al catálogo
        </Link>
      </div>
    </div>
  )
}
