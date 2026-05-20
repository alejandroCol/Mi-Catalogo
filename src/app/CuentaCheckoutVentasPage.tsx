import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { explicitCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaCheckoutVentasPage() {
  const { profile, tenant } = useMcAuth()
  const nav = useNavigate()
  const [checkoutVentasModo, setCheckoutVentasModo] = useState<
    'pasarela' | 'whatsapp' | 'pasarela_micatalogo' | null
  >(null)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  useEffect(() => {
    if (!tenant) return
    setCheckoutVentasModo(explicitCheckoutVentasModo(tenant))
  }, [tenant])

  const pasarelaLista = tenant?.onepayPaymentsEnabled === true
  const pasarelaMicatalogoOk = platformSettings?.pasarelaMicatalogoActiva === true

  async function guardar() {
    if (!profile?.tenantId) return
    if (checkoutVentasModo === null) {
      setMsg('Elegí una opción antes de guardar.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { checkoutVentasModo })
      setMsg('Guardado.')
    } catch {
      setMsg('No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfiguracionesSubpageLayout title="Método de pago">
      <div className="mc-card space-y-5">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          Elegí una opción. La pasarela con tu cuenta OnePay requiere que el equipo la vincule a tu tienda. También podés
          usar la pasarela de Mi Catálogo sin registrar comercio propio, si el equipo la tiene activa.
        </p>
        {checkoutVentasModo === null && (
          <p className="ios-footnote font-medium text-amber-900">
            Elegí una opción para activar el catálogo público y el checkout.
          </p>
        )}
        <CheckoutVentasModoOptions
          value={checkoutVentasModo}
          disabled={busy}
          pasarelaLista={pasarelaLista}
          pasarelaMicatalogoOk={pasarelaMicatalogoOk}
          onSelect={(modo) => {
            setCheckoutVentasModo(modo)
            if (modo === 'pasarela') nav('/app/pagos-pasarela')
          }}
        />
        {msg && <p className="text-[15px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardar()}>
          Guardar
        </button>
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
