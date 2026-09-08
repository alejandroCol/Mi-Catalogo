import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import {
  CATALOG_WHATSAPP_FAB_DEFAULTS,
  CATALOG_WHATSAPP_FAB_LABEL_LIMIT,
  CATALOG_WHATSAPP_FAB_SIDE_OPTIONS,
  CATALOG_WHATSAPP_FAB_STYLE_OPTIONS,
  buildCatalogWhatsappFabForSave,
  catalogWhatsappFabVisible,
  isCatalogWhatsappFabSide,
  isCatalogWhatsappFabStyle,
  tenantHasWhatsappNumber,
} from '@/lib/catalogWhatsappFab'
import { CatalogWhatsappFab } from '@/public/CatalogWhatsappFab'
import type { McCatalogWhatsappFabSide, McCatalogWhatsappFabStyle, McTenant } from '@/types/mc'

function previewTenant(
  base: McTenant,
  draft: {
    enabled: boolean
    style: McCatalogWhatsappFabStyle
    side: McCatalogWhatsappFabSide
    label: string
  },
): McTenant {
  return {
    ...base,
    catalogWhatsappFab: buildCatalogWhatsappFabForSave(draft.enabled, draft),
  }
}

export function CuentaWhatsappFabPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const { showSaveSuccess } = useSaveSuccess()

  const [enabled, setEnabled] = useState(false)
  const [style, setStyle] = useState<McCatalogWhatsappFabStyle>(CATALOG_WHATSAPP_FAB_DEFAULTS.style)
  const [side, setSide] = useState<McCatalogWhatsappFabSide>(CATALOG_WHATSAPP_FAB_DEFAULTS.side)
  const [label, setLabel] = useState(CATALOG_WHATSAPP_FAB_DEFAULTS.label)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tenant) return
    const fab = tenant.catalogWhatsappFab
    setEnabled(!!fab?.enabled)
    setStyle(isCatalogWhatsappFabStyle(fab?.style) ? fab.style : CATALOG_WHATSAPP_FAB_DEFAULTS.style)
    setSide(isCatalogWhatsappFabSide(fab?.side) ? fab.side : CATALOG_WHATSAPP_FAB_DEFAULTS.side)
    setLabel(fab?.label?.trim() || CATALOG_WHATSAPP_FAB_DEFAULTS.label)
  }, [tenant?.id, tenant?.catalogWhatsappFab])

  const hasNumber = tenantHasWhatsappNumber(tenant)
  const draftTenant = useMemo(() => {
    if (!tenant) return null
    return previewTenant(tenant, { enabled, style, side, label })
  }, [tenant, enabled, style, side, label])
  const willShow = draftTenant ? catalogWhatsappFabVisible(draftTenant) : false

  async function guardar() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        catalogWhatsappFab: buildCatalogWhatsappFabForSave(enabled, { style, side, label }),
      })
      showSaveSuccess({
        message: enabled
          ? hasNumber
            ? 'El botón de WhatsApp se actualizó.'
            : 'Guardado. Configurá tu número para que se vea en la tienda.'
          : 'El botón de WhatsApp quedó oculto.',
      })
    } catch (e) {
      setErr(productSaveErrorMessage(e, 'No se pudo guardar. Revisá tu conexión.'))
    } finally {
      setBusy(false)
    }
  }

  if (!tenant) {
    return (
      <ConfiguracionesSubpageLayout title="Botón de WhatsApp" backTo={returnTo} backLabel={returnLabel}>
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title="Botón de WhatsApp" backTo={returnTo} backLabel={returnLabel}>
      <div className="mc-card space-y-5">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Botón de WhatsApp</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Un atajo fijo en la landing de tu catálogo para que te escriban al toque. Usa el mismo
            número de WhatsApp para pedidos.
          </p>
        </div>

        <McToggleSwitch
          id="mc-catalog-wa-fab-enabled"
          checked={enabled}
          disabled={busy}
          onChange={setEnabled}
          label="Mostrar botón de WhatsApp"
          description="Aparece en la esquina de tu catálogo público, sobre la landing y el resto de la tienda."
        />

        {!hasNumber ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950">
            Todavía no hay un número guardado.{' '}
            <Link
              to="/app/cuenta/whatsapp"
              state={navState}
              className="font-medium underline underline-offset-2"
            >
              Configurá WhatsApp
            </Link>{' '}
            para que el botón se vea en la tienda.
          </p>
        ) : null}

        {enabled ? (
          <div className="space-y-5 rounded-xl border border-neutral-200/60 bg-neutral-50/40 p-4 sm:p-5">
            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Estilo</p>
              <div
                className="mt-2.5 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Estilo del botón"
              >
                {CATALOG_WHATSAPP_FAB_STYLE_OPTIONS.map((option) => {
                  const selected = style === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => setStyle(option.id)}
                      className={clsx(
                        'rounded-xl border px-3 py-2.5 text-left transition',
                        selected
                          ? 'border-[var(--cat-text)] bg-white shadow-sm'
                          : 'border-neutral-200/80 bg-white/70 hover:border-neutral-300',
                      )}
                    >
                      <span className="mb-2 flex min-h-10 items-center">
                        <span className="origin-left scale-[0.72]">
                          <CatalogWhatsappFab
                            preview
                            tenant={previewTenant(tenant, {
                              enabled: true,
                              style: option.id,
                              side,
                              label,
                            })}
                          />
                        </span>
                      </span>
                      <span className="block text-[14px] font-medium text-[var(--cat-text)]">
                        {option.title}
                      </span>
                      <span className="ios-footnote mt-0.5 block text-[var(--cat-muted)]">
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {style === 'pill' ? (
              <div>
                <label
                  htmlFor="mc-catalog-wa-fab-label"
                  className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
                >
                  Texto del botón
                </label>
                <input
                  id="mc-catalog-wa-fab-label"
                  className="mc-input mt-1.5"
                  value={label}
                  maxLength={CATALOG_WHATSAPP_FAB_LABEL_LIMIT}
                  disabled={busy}
                  placeholder={CATALOG_WHATSAPP_FAB_DEFAULTS.label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
                  {label.length}/{CATALOG_WHATSAPP_FAB_LABEL_LIMIT}
                </p>
              </div>
            ) : null}

            <div>
              <p className="ios-footnote font-medium text-[var(--cat-text)] opacity-80">Posición</p>
              <div
                className="mt-2.5 grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Posición del botón"
              >
                {CATALOG_WHATSAPP_FAB_SIDE_OPTIONS.map((option) => {
                  const selected = side === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => setSide(option.id)}
                      className={clsx(
                        'rounded-xl border px-3 py-2.5 text-left transition',
                        selected
                          ? 'border-[var(--cat-text)] bg-white shadow-sm'
                          : 'border-neutral-200/80 bg-white/70 hover:border-neutral-300',
                      )}
                    >
                      <span className="block text-[14px] font-medium text-[var(--cat-text)]">
                        {option.title}
                      </span>
                      <span className="ios-footnote mt-0.5 block text-[var(--cat-muted)]">
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="mc-btn-primary px-5 py-2.5 text-[15px]"
          disabled={busy}
          onClick={() => void guardar()}
        >
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {err ? (
          <p className="text-[14px] text-red-800" aria-live="polite">
            {err}
          </p>
        ) : null}
      </div>

      {enabled && draftTenant ? (
        <section className="mc-card mt-6 overflow-hidden p-0">
          <div className="border-b border-neutral-200/60 px-4 py-3 sm:px-5">
            <p className="ios-footnote font-medium text-[var(--cat-text)]">Vista previa en tu landing</p>
            <p className="ios-footnote mt-1 text-[var(--cat-muted)]">
              {willShow
                ? 'Así lo verán tus clientes al entrar al catálogo.'
                : 'El estilo queda listo. Falta el número de WhatsApp para publicarlo.'}
            </p>
          </div>
          <div className="relative h-52 overflow-hidden bg-[color-mix(in_srgb,var(--cat-text)_82%,#1a1a1a)] sm:h-60">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.14),transparent_55%)]" />
            <div className="absolute left-5 top-5 text-white">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] opacity-70">
                Nueva temporada
              </p>
              <p className="mt-1 text-[17px] font-semibold tracking-tight">
                {tenant.nombreTienda || 'Tu tienda'}
              </p>
            </div>
            <div
              className={clsx(
                'absolute bottom-5',
                side === 'right' ? 'right-5' : 'left-5',
              )}
            >
              <CatalogWhatsappFab preview tenant={draftTenant} />
            </div>
          </div>
        </section>
      ) : null}
    </ConfiguracionesSubpageLayout>
  )
}
