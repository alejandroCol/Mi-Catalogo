import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  isPublishFromHomeNav,
  navigateConfigReturn,
  PAGOS_PASARELA_RETURN_FROM_SELECCION,
  type ConfigSubpageNavState,
} from '@/app/configuraciones/configSubpageNav'
import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { checkoutVentasModoDisplay } from '@/lib/checkoutVentasModoDisplay'
import { CONFIG_CHECKOUT_VENTAS_PATH } from '@/app/CheckoutVentasRequiredModal'

export function CheckoutVentasModoSuccessModal({
  open,
  modo,
  navState,
  onClose,
}: {
  open: boolean
  modo: McCheckoutVentasModo | null
  navState?: ConfigSubpageNavState
  onClose: () => void
}) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !modo) return null

  const info = checkoutVentasModoDisplay(modo)

  function volverAlResumen() {
    onClose()
    if (isPublishFromHomeNav(navState)) {
      if (modo === 'whatsapp') {
        navigate('/app/cuenta/whatsapp', { state: navState })
        return
      }
      if (modo === 'pasarela') {
        navigate('/app/pagos-pasarela', { state: navState })
        return
      }
      navigateConfigReturn(navigate, navState!)
      return
    }
    navigate(CONFIG_CHECKOUT_VENTAS_PATH, navState ? { state: navState } : undefined)
  }

  function irAConfiguracionExtra() {
    onClose()
    if (modo === 'pasarela') {
      navigate('/app/pagos-pasarela', {
        state: isPublishFromHomeNav(navState) ? navState : PAGOS_PASARELA_RETURN_FROM_SELECCION,
      })
    } else if (modo === 'whatsapp') {
      navigate('/app/cuenta/whatsapp', isPublishFromHomeNav(navState) ? { state: navState } : undefined)
    } else navigate(CONFIG_CHECKOUT_VENTAS_PATH)
  }

  const extraLabel =
    modo === 'pasarela'
      ? 'Configurar OnePay'
      : modo === 'whatsapp'
        ? 'Configurar WhatsApp'
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-ventas-success-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={volverAlResumen} />
      <div className="relative mx-4 mb-4 w-full max-w-md rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 id="mc-ventas-success-title" className="ios-headline mt-4 text-center text-[var(--cat-text)]">
          Método de pago seleccionado con éxito
        </h2>
        <p className="ios-footnote mt-2 text-center leading-relaxed text-[var(--cat-muted)]">
          Elegiste <strong className="font-medium text-[var(--cat-text)]">{info.title}</strong>. Podés cambiarlo cuando
          quieras desde Configuraciones.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px]"
            onClick={volverAlResumen}
          >
            Listo
          </button>
          {extraLabel ? (
            <button
              type="button"
              className="mc-btn-secondary inline-flex w-full items-center justify-center py-3 text-[15px]"
              onClick={irAConfiguracionExtra}
            >
              {extraLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
