import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import type { McPlatformSettings, McTenant } from '@/types/mc'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'

/** Ancla en `CuentaPage` para «Checkout · cómo cerrás ventas». */
export const MC_CHECKOUT_VENTAS_ANCHOR = 'mc-checkout-ventas'

/** Ancla en `CuentaPage` para el número de WhatsApp de pedidos. */
export const MC_CHECKOUT_WHATSAPP_ANCHOR = 'mc-checkout-whatsapp'

export function CheckoutVentasRequiredModal({
  open,
  onClose,
  context,
  tenant,
  tenantId,
  platformSettings,
  onModoSelected,
}: {
  open: boolean
  onClose: () => void
  context: 'cuenta' | 'dashboard'
  tenant: Pick<McTenant, 'onepayPaymentsEnabled' | 'checkoutVentasModo'> | null
  tenantId?: string
  platformSettings: McPlatformSettings | null
  /** Solo en contexto cuenta: actualizar estado local al elegir modo. */
  onModoSelected?: (modo: McCheckoutVentasModo) => void
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, busy])

  if (!open) return null

  const pasarelaLista = tenant?.onepayPaymentsEnabled === true
  const pasarelaMicatalogoOk = platformSettings?.pasarelaMicatalogoActiva === true

  function scrollToCheckoutVentasSection() {
    requestAnimationFrame(() => {
      document.getElementById(MC_CHECKOUT_VENTAS_ANCHOR)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  function scrollToWhatsappSection() {
    requestAnimationFrame(() => {
      document.getElementById(MC_CHECKOUT_WHATSAPP_ANCHOR)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function persistModo(modo: McCheckoutVentasModo) {
    if (!firebaseConfigured || !tenantId) return
    await updateDoc(doc(getDb(), MC.tenants, tenantId), { checkoutVentasModo: modo })
  }

  async function handleSelect(modo: McCheckoutVentasModo) {
    if (busy) return
    setBusy(true)
    try {
      await persistModo(modo)
      onModoSelected?.(modo)

      if (modo === 'pasarela') {
        onClose()
        navigate('/app/pagos-pasarela')
        return
      }

      if (modo === 'pasarela_micatalogo') {
        onClose()
        if (context === 'cuenta') {
          scrollToCheckoutVentasSection()
        } else {
          navigate(`/app/cuenta#${MC_CHECKOUT_VENTAS_ANCHOR}`)
        }
        return
      }

      // whatsapp
      onClose()
      if (context === 'cuenta') {
        scrollToWhatsappSection()
      } else {
        navigate(`/app/cuenta#${MC_CHECKOUT_WHATSAPP_ANCHOR}`)
      }
    } catch {
      onClose()
      if (modo === 'pasarela') navigate('/app/pagos-pasarela')
      else if (modo === 'whatsapp') navigate(`/app/cuenta#${MC_CHECKOUT_WHATSAPP_ANCHOR}`)
      else navigate(`/app/cuenta#${MC_CHECKOUT_VENTAS_ANCHOR}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-ventas-req-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        disabled={busy}
        onClick={onClose}
      />
      <div className="relative mx-4 mb-4 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-neutral-200/55 bg-[var(--cat-surface)] p-5 shadow-lg sm:mx-0 sm:mb-0 sm:rounded-xl">
        <h2 id="mc-ventas-req-title" className="ios-headline text-[var(--cat-text)]">
          Configurá cómo cobrás
        </h2>
        <p className="ios-footnote mt-2 leading-relaxed text-[var(--cat-muted)]">
          Elegí un método para activar el catálogo público y el checkout. Podés cambiarlo después en Cuenta.
        </p>

        <CheckoutVentasModoOptions
          value={null}
          disabled={busy}
          pasarelaLista={pasarelaLista}
          pasarelaMicatalogoOk={pasarelaMicatalogoOk}
          onSelect={(modo) => void handleSelect(modo)}
        />

        <button
          type="button"
          className="mc-btn-secondary mt-4 inline-flex w-full items-center justify-center py-3 text-[15px]"
          disabled={busy}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
