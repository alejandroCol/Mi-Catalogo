import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { explicitCheckoutVentasModo, isCheckoutVentasConfigured } from '@/lib/checkoutVentasModo'
import { checkoutVentasModoDisplay } from '@/lib/checkoutVentasModoDisplay'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { IconBankCard } from '@/icons/McIcons'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaCheckoutVentasPage() {
  const { tenant } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  const checkoutVentasModo = explicitCheckoutVentasModo(tenant)
  const configurado = isCheckoutVentasConfigured(tenant, platformSettings)

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
            return (
              <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mc-500/10 text-mc-600">
                    <IconBankCard size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--cat-muted)]">
                      Método activo
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
                {!configurado ? (
                  <p className="mt-3 text-[12px] font-medium text-amber-800">
                    {checkoutVentasModo === 'pasarela'
                      ? 'Completá la vinculación con OnePay para activar cobros.'
                      : checkoutVentasModo === 'whatsapp'
                        ? 'Configurá tu número de WhatsApp para recibir pedidos.'
                        : 'Esperá a que el equipo active la pasarela de Mi Catálogo.'}
                  </p>
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
      </div>
    </ConfiguracionesSubpageLayout>
  )
}
