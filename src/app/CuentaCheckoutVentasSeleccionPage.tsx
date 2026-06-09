import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { CheckoutVentasModoOptions } from '@/app/CheckoutVentasModoOptions'
import { CheckoutVentasModoSuccessModal } from '@/app/CheckoutVentasModoSuccessModal'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import {
  isPublishFromHomeNav,
  PAGOS_PASARELA_RETURN_FROM_SELECCION,
  useConfigSubpageNav,
} from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  canSelectPasarelaOnepay,
  explicitCheckoutVentasModo,
  onepayPasarelaGateUi,
  type McCheckoutVentasModo,
} from '@/lib/checkoutVentasModo'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaCheckoutVentasSeleccionPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const navigate = useNavigate()
  const { returnTo, returnLabel, navState, fromOutsideConfig } = useConfigSubpageNav()
  const [checkoutVentasModo, setCheckoutVentasModo] = useState<McCheckoutVentasModo | null>(null)
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [successModo, setSuccessModo] = useState<McCheckoutVentasModo | null>(null)

  const onepayPasarelaGate = useMemo(() => onepayPasarelaGateUi(tenant), [tenant])

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

  const pasarelaMicatalogoOk = platformSettings?.pasarelaMicatalogoActiva === true

  const displayValue = useMemo((): McCheckoutVentasModo | null => {
    if (!checkoutVentasModo) return null
    if (checkoutVentasModo === 'pasarela' && !canSelectPasarelaOnepay(tenant)) return null
    return checkoutVentasModo
  }, [checkoutVentasModo, tenant])

  const storedPasarelaInactive =
    checkoutVentasModo === 'pasarela' && !canSelectPasarelaOnepay(tenant)

  async function handleSelect(modo: McCheckoutVentasModo) {
    if (!effectiveTenantId || busy) return

    if (modo === 'pasarela' && !canSelectPasarelaOnepay(tenant)) {
      navigate('/app/pagos-pasarela', {
        state: isPublishFromHomeNav(navState) ? navState : PAGOS_PASARELA_RETURN_FROM_SELECCION,
      })
      return
    }

    setBusy(true)
    setErrMsg(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), { checkoutVentasModo: modo })
      setCheckoutVentasModo(modo)
      setSuccessModo(modo)
    } catch (saveErr: unknown) {
      setErrMsg(productSaveErrorMessage(saveErr, 'No se pudo guardar. Intentá de nuevo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ConfiguracionesSubpageLayout
        title="Seleccionar método de pago"
        backTo={fromOutsideConfig ? returnTo : '/app/cuenta/checkout-ventas'}
        backLabel={fromOutsideConfig ? returnLabel : '← Método de pago'}
      >
        <p className="text-[13px] leading-relaxed text-[var(--cat-muted)] sm:text-[14px]">
          Tocá una opción para guardarla al instante. Cada método tiene ventajas distintas según cómo quieras cobrar.
        </p>

        {storedPasarelaInactive ? (
          <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 px-4 py-4 sm:px-5">
            <p className="text-[14px] font-semibold text-sky-950">Pasarela OnePay aún no activa</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-sky-900/90">{onepayPasarelaGate.message}</p>
            <button
              type="button"
              className="mt-3 text-[13px] font-semibold text-sky-950 underline underline-offset-2 hover:no-underline"
              onClick={() =>
                navigate('/app/pagos-pasarela', {
                  state: isPublishFromHomeNav(navState) ? navState : PAGOS_PASARELA_RETURN_FROM_SELECCION,
                })
              }
            >
              {onepayPasarelaGate.ctaLabel ?? 'Ir a OnePay'}
            </button>
          </div>
        ) : null}

        <CheckoutVentasModoOptions
          variant="detailed"
          value={displayValue}
          disabled={busy}
          onepayPasarelaGate={onepayPasarelaGate}
          pasarelaMicatalogoOk={pasarelaMicatalogoOk}
          onSelect={(modo) => void handleSelect(modo)}
        />
        {errMsg ? <p className="text-[15px] text-red-700">{errMsg}</p> : null}
      </ConfiguracionesSubpageLayout>

      <CheckoutVentasModoSuccessModal
        open={successModo !== null}
        modo={successModo}
        navState={navState}
        onClose={() => setSuccessModo(null)}
      />
    </>
  )
}
