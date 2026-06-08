import { useMemo } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { EnvioModoOptionCards } from '@/app/envio/EnvioModoOptionCards'
import { useMcAuth } from '@/auth/McAuthContext'
import { formatCop } from '@/lib/formatCop'
import { explicitEnvioModo } from '@/lib/envioModo'
import {
  MC_ENVIA_CARRIER_LABELS,
  isMcEnviaCarrierCode,
  type McEnviaCarrierCode,
} from '@/lib/envioCotizacion'
import { isEnvioCheckoutConfigured } from '@/lib/checkoutShipping'

export function CuentaEnvioPage() {
  const { tenant } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const activeModo = explicitEnvioModo(tenant)
  const configurado = tenant ? isEnvioCheckoutConfigured(tenant) : false

  const resumen = useMemo(() => {
    if (!tenant || !activeModo) return null
    const g = tenant.envioGratisDesdeCop
    const parts: string[] = []
    if (activeModo === 'automatico') {
      parts.push('Cotización automática')
      const fav = tenant.envioTransportadoraFavorita?.trim().toLowerCase() ?? ''
      if (isMcEnviaCarrierCode(fav)) {
        parts.push(`Preferida: ${MC_ENVIA_CARRIER_LABELS[fav as McEnviaCarrierCode]}`)
      }
      if (tenant.envioOrigenCiudad?.trim()) {
        parts.push(`Desde ${tenant.envioOrigenCiudad.trim()}`)
      }
    } else {
      const n = (tenant.envioPorCiudad ?? []).filter((x) => x?.ciudad?.trim()).length
      parts.push(n > 0 ? `${n} ciudad(es) con precio fijo` : 'Precios manuales')
    }
    if (g != null && g > 0) parts.push(`Gratis desde ${formatCop(g)}`)
    return parts.join(' · ')
  }, [tenant, activeModo])

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} />
        <h1 className="ios-large-title mt-3">Configurar envío</h1>
        <p className="ios-subhead mt-2 max-w-lg leading-relaxed text-[var(--cat-muted)]">
          Elegí cómo calcular el envío en el checkout. Solo podés usar un método a la vez.
        </p>
      </div>

      {configurado && resumen ? (
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-800">Configuración actual</p>
          <p className="mt-1 text-[13px] leading-relaxed text-emerald-950">{resumen}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200/55 bg-amber-50/35 px-4 py-3.5">
          <p className="text-[13px] leading-relaxed text-amber-950">
            Aún no elegiste un método de envío. Tocá una opción para configurarlo.
          </p>
        </div>
      )}

      <EnvioModoOptionCards value={activeModo} navState={navState} />
    </div>
  )
}
