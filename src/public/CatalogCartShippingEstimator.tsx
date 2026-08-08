import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { formatCop } from '@/lib/formatCop'
import { isEnvioCheckoutConfigured } from '@/lib/checkoutShipping'
import { useEnvioCheckoutQuote } from '@/hooks/useEnvioCheckoutQuote'
import { DepartamentoCombobox } from '@/public/DepartamentoCombobox'
import { MunicipioCombobox } from '@/public/MunicipioCombobox'
import type { McPlatformSettings, McTenant } from '@/types/mc'

const LS_KEY = 'mc_cart_envio_est'

type SavedDestino = { departamento: string; ciudad: string }

function loadSaved(): SavedDestino {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { departamento: '', ciudad: '' }
    const p = JSON.parse(raw) as SavedDestino
    return {
      departamento: typeof p.departamento === 'string' ? p.departamento : '',
      ciudad: typeof p.ciudad === 'string' ? p.ciudad : '',
    }
  } catch {
    return { departamento: '', ciudad: '' }
  }
}

function saveDestino(d: SavedDestino) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

type Props = {
  slug: string
  tenant: McTenant
  platformSettings: McPlatformSettings | null | undefined
  subtotalCop: number
  totalPiezas: number
  className?: string
}

export function CatalogCartShippingEstimator({
  slug,
  tenant,
  platformSettings,
  subtotalCop,
  totalPiezas,
  className,
}: Props) {
  const configured = isEnvioCheckoutConfigured(tenant)
  const [open, setOpen] = useState(() => {
    const s = loadSaved()
    return Boolean(s.departamento && s.ciudad)
  })
  const [departamento, setDepartamento] = useState(() => loadSaved().departamento)
  const [ciudad, setCiudad] = useState(() => loadSaved().ciudad)

  const quote = useEnvioCheckoutQuote({
    slug,
    tenant,
    platformSettings,
    envioDepartamento: departamento,
    envioCiudad: ciudad,
    envioDireccion: '',
    destinoNombre: '',
    destinoTelefono: '',
    subtotalCop,
    totalPiezas,
  })

  const canEstimate = departamento.trim().length > 0 && ciudad.trim().length > 0
  const estimado = useMemo(() => {
    if (!canEstimate) return null
    return quote
  }, [canEstimate, quote])

  if (!configured) return null

  const resultLabel =
    estimado && canEstimate
      ? estimado.loading
        ? 'Cotizando…'
        : estimado.envioCop <= 0
          ? `Envío gratis a ${ciudad}`
          : `Envío ${formatCop(estimado.envioCop)} · ${ciudad}`
      : null

  return (
    <div className={clsx(className ?? 'mt-3')}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group inline-flex items-center gap-1.5 text-[11px] text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
        >
          <span className="underline decoration-[color-mix(in_srgb,var(--cat-muted)_40%,transparent)] underline-offset-4 group-hover:decoration-[var(--cat-text)]">
            Envío
          </span>
        </button>
      ) : (
        <div className="mc-pc-ship-est-panel space-y-2.5 rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_12%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_28%,var(--cat-surface)_72%)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-[var(--cat-text)]">Calcular envío</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-[var(--cat-muted)] transition hover:text-[var(--cat-text)]"
            >
              Cerrar
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-medium text-[var(--cat-muted)]">Departamento</label>
              <DepartamentoCombobox
                value={departamento}
                onChange={(next) => {
                  setDepartamento(next)
                  setCiudad('')
                  saveDestino({ departamento: next, ciudad: '' })
                }}
                inputClassName="mc-input mt-0.5 py-1.5 text-[12px]"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--cat-muted)]">Ciudad</label>
              <MunicipioCombobox
                departamento={departamento}
                value={ciudad}
                onChange={(next) => {
                  setCiudad(next)
                  saveDestino({ departamento, ciudad: next })
                }}
                inputClassName="mc-input mt-0.5 py-1.5 text-[12px]"
                disabled={!departamento}
              />
            </div>
          </div>

          {resultLabel ? (
            <div className="text-[12px] leading-snug">
              <p className="font-medium tabular-nums text-[var(--cat-text)]">{resultLabel}</p>
              {canEstimate && estimado && !estimado.loading ? (
                <p className="mt-0.5 text-[10px] text-[var(--cat-muted)]">
                  Total estimado{' '}
                  <span className="font-medium text-[var(--cat-text)]">
                    {formatCop(subtotalCop + (estimado.envioCop ?? 0))}
                  </span>
                  {estimado.seleccionada?.carrier
                    ? ` · ${estimado.seleccionada.carrier}`
                    : estimado.fuente === 'estatico'
                      ? ' · tarifa de la tienda'
                      : null}
                </p>
              ) : null}
              {estimado?.error ? (
                <p className="mt-0.5 text-[10px] text-amber-800">{estimado.error}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--cat-muted)]">Elegí departamento y ciudad para cotizar.</p>
          )}
        </div>
      )}
    </div>
  )
}
