import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import {
  navigateConfigReturn,
  PAGOS_PASARELA_RETURN_FROM_CHECKOUT_VENTAS,
  useConfigSubpageNav,
  type ConfigSubpageNavState,
} from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  explicitCheckoutVentasModo,
  isCheckoutVentasConfigured,
  onepayPasarelaGateUi,
} from '@/lib/checkoutVentasModo'
import { checkoutVentasModoDisplay } from '@/lib/checkoutVentasModoDisplay'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { IconBankCard } from '@/icons/McIcons'
import type { McPlatformSettings } from '@/types/mc'
import { hasAddiFeatureAccess } from '@/lib/addiAccess'

function PasarelaStatusPanel({
  gate,
  configurado,
  pasarelaLinkState,
}: {
  gate: ReturnType<typeof onepayPasarelaGateUi>
  configurado: boolean
  pasarelaLinkState: ConfigSubpageNavState
}) {
  if (configurado) {
    return <p className="mt-3 text-[12px] font-medium text-emerald-800">Listo para cobrar en tu checkout.</p>
  }

  const toneClasses =
    gate.tone === 'info'
      ? 'border-sky-200/80 bg-sky-50/55 text-sky-950'
      : gate.tone === 'error'
        ? 'border-red-200/80 bg-red-50/55 text-red-950'
        : 'border-amber-200/80 bg-amber-50/55 text-amber-950'

  return (
    <div className={`mt-3 rounded-xl border px-3.5 py-3 ${toneClasses}`}>
      <p className="text-[12px] font-semibold">{gate.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed opacity-90">{gate.message}</p>
      {gate.ctaLabel ? (
        <Link
          to="/app/pagos-pasarela"
          state={pasarelaLinkState}
          className="mt-2.5 inline-flex text-[12px] font-semibold underline underline-offset-2 hover:no-underline"
        >
          {gate.ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}

export function CuentaCheckoutVentasPage() {
  const { tenant } = useMcAuth()
  const navigate = useNavigate()
  const { returnTo, returnLabel, navState, publishFromHome } = useConfigSubpageNav()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)

  const onepayPasarelaGate = useMemo(() => onepayPasarelaGateUi(tenant), [tenant])

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  const checkoutVentasModo = explicitCheckoutVentasModo(tenant)
  const configurado = isCheckoutVentasConfigured(tenant, platformSettings)
  const pasarelaLinkState = publishFromHome ? navState : PAGOS_PASARELA_RETURN_FROM_CHECKOUT_VENTAS

  useEffect(() => {
    if (!publishFromHome || !configurado) return
    navigateConfigReturn(navigate, navState)
  }, [publishFromHome, configurado, navigate, navState])

  return (
    <ConfiguracionesSubpageLayout title="Método de pago" backTo={returnTo} backLabel={returnLabel}>
      <div className="mc-card space-y-5">
        <p className="ios-footnote leading-relaxed text-[var(--cat-muted)]">
          Definí cómo cobrás en tu catálogo: pasarela en línea con OnePay, pasarela de Mi Catálogo sin registro propio,
          o coordinación por WhatsApp.
        </p>

        {checkoutVentasModo === null ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-4">
            <p className="text-[14px] font-semibold text-amber-950">Aún no elegiste un método</p>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90">
              Elegí una opción para activar el catálogo público y el checkout.
            </p>
          </div>
        ) : (
          (() => {
            const info = checkoutVentasModoDisplay(checkoutVentasModo)
            const pasarelaPendiente = checkoutVentasModo === 'pasarela' && !configurado
            return (
              <div
                className={`rounded-xl border p-4 ${
                  pasarelaPendiente
                    ? 'border-sky-200/70 bg-sky-50/25'
                    : configurado
                      ? 'border-neutral-200/70 bg-neutral-50/40'
                      : 'border-amber-200/70 bg-amber-50/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      configurado ? 'bg-mc-500/10 text-mc-600' : 'bg-neutral-100 text-[var(--cat-muted)]'
                    }`}
                  >
                    <IconBankCard size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-muted)]">
                      {configurado ? 'Método activo' : 'Método elegido — pendiente de activar'}
                    </p>
                    <p className="mt-0.5 text-[16px] font-semibold text-[var(--cat-text)]">{info.title}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">{info.summary}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 border-t border-neutral-200/60 pt-4">
                  {info.highlights.slice(0, 2).map((line) => (
                    <li key={line} className="flex gap-2 text-[12px] leading-snug text-[var(--cat-text)]">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mc-500" aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {info.paymentMethods ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {info.paymentMethods.map((label) => (
                      <span
                        key={label}
                        className="border border-[color-mix(in_srgb,var(--cat-text)_12%,transparent)] bg-[var(--cat-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-text)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {checkoutVentasModo === 'pasarela' ? (
                  <PasarelaStatusPanel
                    gate={onepayPasarelaGate}
                    configurado={configurado}
                    pasarelaLinkState={pasarelaLinkState}
                  />
                ) : !configurado ? (
                  <div className="mt-3">
                    <p className="text-[12px] font-medium text-amber-800">
                      {checkoutVentasModo === 'whatsapp'
                        ? 'Configurá tu número de WhatsApp para recibir pedidos.'
                        : 'Esperá a que el equipo active la pasarela de Mi Catálogo.'}
                    </p>
                    {checkoutVentasModo === 'whatsapp' && publishFromHome ? (
                      <Link
                        to="/app/cuenta/whatsapp"
                        state={navState}
                        className="mt-2 inline-flex text-[12px] font-semibold text-amber-950 underline underline-offset-2 hover:no-underline"
                      >
                        Configurar WhatsApp →
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] font-medium text-emerald-800">Listo para cobrar en tu checkout.</p>
                )}
              </div>
            )
          })()
        )}

        <Link
          to="/app/cuenta/checkout-ventas/seleccion"
          state={navState}
          className="mc-btn-primary inline-flex w-full items-center justify-center py-3 text-[15px]"
        >
          Seleccionar método de pago
        </Link>

        {hasAddiFeatureAccess(tenant) ? (
          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/40 px-4 py-4">
            <p className="text-[14px] font-semibold text-[var(--cat-text)]">Addi · Cuotas</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--cat-muted)]">
              Opción extra para Master: tus clientes pueden financiar con Addi si pegás las credenciales del comercio.
            </p>
            <Link
              to="/app/pagos-addi"
              state={navState}
              className="mt-2.5 inline-flex text-[12px] font-semibold text-[var(--cat-text)] underline underline-offset-2"
            >
              {tenant?.addiPaymentsEnabled ? 'Administrar Addi →' : 'Configurar Addi →'}
            </Link>
          </div>
        ) : null}
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
