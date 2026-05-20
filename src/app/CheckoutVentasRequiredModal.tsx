import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import type { McPlatformSettings, McTenant } from '@/types/mc'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'

/** @deprecated Usar `CONFIG_CHECKOUT_VENTAS_PATH`. */
export const MC_CHECKOUT_VENTAS_ANCHOR = 'mc-checkout-ventas'

/** @deprecated Usar `CONFIG_WHATSAPP_PATH`. */
export const MC_CHECKOUT_WHATSAPP_ANCHOR = 'mc-checkout-whatsapp'

export const CONFIG_CHECKOUT_VENTAS_PATH = '/app/cuenta/checkout-ventas'
export const CONFIG_WHATSAPP_PATH = '/app/cuenta/whatsapp'

export function CheckoutVentasRequiredModal({
  open,
  onClose,
  context: _context,
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

  function irACheckoutVentas() {
    navigate(CONFIG_CHECKOUT_VENTAS_PATH)
  }

  function irAWhatsapp() {
    navigate(CONFIG_WHATSAPP_PATH)
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
        irACheckoutVentas()
        return
      }

      onClose()
      irAWhatsapp()
    } catch {
      onClose()
      if (modo === 'pasarela') navigate('/app/pagos-pasarela')
      else if (modo === 'whatsapp') navigate(CONFIG_WHATSAPP_PATH)
      else navigate(CONFIG_CHECKOUT_VENTAS_PATH)
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
          Elegí un método para activar el catálogo público y el checkout. Podés cambiarlo después en Configuraciones.
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
