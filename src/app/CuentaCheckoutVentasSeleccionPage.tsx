import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'
import { CheckoutVentasModoSuccessModal } from '@/app/CheckoutVentasModoSuccessModal'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useMcAuth } from '@/auth/McAuthContext'
import { explicitCheckoutVentasModo, type McCheckoutVentasModo } from '@/lib/checkoutVentasModo'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaCheckoutVentasSeleccionPage() {
  const { profile, tenant } = useMcAuth()
  const [checkoutVentasModo, setCheckoutVentasModo] = useState<McCheckoutVentasModo | null>(null)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [successModo, setSuccessModo] = useState<McCheckoutVentasModo | null>(null)

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

  async function handleSelect(modo: McCheckoutVentasModo) {
    if (!profile?.tenantId || busy) return
    setBusy(true)
    setErrMsg(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, profile.tenantId), { checkoutVentasModo: modo })
      setCheckoutVentasModo(modo)
      setSuccessModo(modo)
    } catch {
      setErrMsg('No se pudo guardar. Intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ConfiguracionesSubpageLayout
        title="Seleccionar método de pago"
        backTo="/app/cuenta/checkout-ventas"
        backLabel="← Método de pago"
      >
        <div className="mc-card space-y-5">
          <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
            Tocá una opción para guardarla al instante. Cada método tiene ventajas distintas según cómo quieras cobrar.
          </p>
          <CheckoutVentasModoOptions
            variant="detailed"
            value={checkoutVentasModo}
            disabled={busy}
            pasarelaLista={pasarelaLista}
            pasarelaMicatalogoOk={pasarelaMicatalogoOk}
            onSelect={(modo) => void handleSelect(modo)}
          />
          {errMsg ? <p className="text-[15px] text-red-700">{errMsg}</p> : null}
        </div>
      </ConfiguracionesSubpageLayout>

      <CheckoutVentasModoSuccessModal
        open={successModo !== null}
        modo={successModo}
        onClose={() => setSuccessModo(null)}
      />
    </>
  )
}
