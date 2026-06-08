import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { CheckoutEnvioRequiredModal } from '@/app/CheckoutEnvioRequiredModal'
import { CheckoutVentasRequiredModal } from '@/app/CheckoutVentasRequiredModal'
import { CompartirCatalogoChecklistView } from '@/app/CompartirCatalogoChecklistView'
import { ConfiguracionesBackLink, ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { IconClipboard, IconLink } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import {
  catalogoVendedorGate,
  isCatalogoVendedorListo,
  isCheckoutVentasConfigured,
} from '@/lib/checkoutVentasModo'
import { isEnvioCheckoutConfigured } from '@/lib/checkoutShipping'
import { MC } from '@/lib/mcCollections'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaTiendaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState, fromOutsideConfig } = useConfigSubpageNav()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [copiedCatalogo, setCopiedCatalogo] = useState(false)
  const [ventasRequiredModalOpen, setVentasRequiredModalOpen] = useState(false)
  const [envioRequiredModalOpen, setEnvioRequiredModalOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [descuentosTabEnabled, setDescuentosTabEnabled] = useState(false)
  const [descuentosTabLabel, setDescuentosTabLabel] = useState('')
  const [descuentosTabBusy, setDescuentosTabBusy] = useState(false)
  const [descuentosTabErr, setDescuentosTabErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  useEffect(() => {
    if (!firebaseConfigured) return
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
    })
  }, [])

  useEffect(() => {
    if (!tenant) return
    setDescuentosTabEnabled(!!tenant.catalogDescuentosTab?.enabled)
    setDescuentosTabLabel(tenant.catalogDescuentosTab?.label ?? '')
  }, [tenant?.id, tenant?.catalogDescuentosTab?.enabled, tenant?.catalogDescuentosTab?.label])

  const catalogoUrlAbsolute = useMemo(() => {
    if (!tenant?.slug) return ''
    return buildStorePublicUrl(tenant.slug)
  }, [tenant?.slug])

  const catalogoListo = tenant ? isCatalogoVendedorListo(tenant, platformSettings) : false
  const ventasOk = tenant ? isCheckoutVentasConfigured(tenant, platformSettings) : false
  const envioOk = tenant ? isEnvioCheckoutConfigured(tenant, platformSettings) : false
  const gate = tenant ? catalogoVendedorGate(tenant, platformSettings) : 'ventas'

  function solicitarAccesoCatalogo(): boolean {
    if (gate === 'ventas') {
      setVentasRequiredModalOpen(true)
      return false
    }
    if (gate === 'envio') {
      setEnvioRequiredModalOpen(true)
      return false
    }
    return true
  }

  async function copiarUrlCatalogo() {
    if (!solicitarAccesoCatalogo()) return
    if (!catalogoUrlAbsolute || !navigator.clipboard?.writeText) return
    try {
      await navigator.clipboard.writeText(catalogoUrlAbsolute)
      setCopiedCatalogo(true)
      window.setTimeout(() => setCopiedCatalogo(false), 2200)
    } catch {
      setMsg('No se pudo copiar. Copiá manualmente desde la barra del navegador.')
    }
  }

  async function guardarDescuentosTab() {
    if (!effectiveTenantId || !tenant) return
    setDescuentosTabBusy(true)
    setDescuentosTabErr(null)
    try {
      const labelTrim = descuentosTabLabel.trim()
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        catalogDescuentosTab: descuentosTabEnabled
          ? {
              enabled: true,
              ...(labelTrim ? { label: labelTrim.slice(0, 32) } : {}),
            }
          : deleteField(),
      })
      showSaveSuccess({ message: 'La pestaña de descuentos del catálogo se actualizó.' })
    } catch {
      setDescuentosTabErr('No se pudo guardar. Revisá conexión.')
    } finally {
      setDescuentosTabBusy(false)
    }
  }

  const pageTitle = fromOutsideConfig ? 'Compartí tu catálogo' : 'Tienda y catálogo'

  if (!tenant) {
    if (fromOutsideConfig) {
      return (
        <div className="mc-shell flex flex-col gap-5 sm:gap-6">
          <ConfiguracionesBackLink to={returnTo} label={returnLabel} />
          <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
        </div>
      )
    }
    return (
      <ConfiguracionesSubpageLayout title={pageTitle} backTo={returnTo} backLabel={returnLabel}>
        <p className="ios-footnote text-[var(--cat-muted)]">Cargando…</p>
      </ConfiguracionesSubpageLayout>
    )
  }

  if (fromOutsideConfig) {
    return (
      <div className="mc-shell flex flex-col gap-5 sm:gap-6">
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} />
        <header className="space-y-1">
          <h1 className="ios-large-title">Compartí tu catálogo</h1>
          <p className="ios-footnote max-w-lg leading-relaxed text-[var(--cat-muted)]">
            Este es el último paso del checklist. Compartí tu enlace cuando esté listo.
          </p>
        </header>

        <CompartirCatalogoChecklistView
          tenantName={tenant.nombreTienda}
          catalogoUrl={catalogoUrlAbsolute}
          catalogoListo={catalogoListo}
          ventasOk={ventasOk}
          envioOk={envioOk}
          copied={copiedCatalogo}
          msg={msg}
          navState={navState}
          onCopy={() => void copiarUrlCatalogo()}
          onOpenCatalog={(e) => {
            if (catalogoListo) return
            e.preventDefault()
            void solicitarAccesoCatalogo()
          }}
        />

        <CheckoutVentasRequiredModal
          open={ventasRequiredModalOpen}
          onClose={() => setVentasRequiredModalOpen(false)}
          context="dashboard"
          tenant={tenant}
          tenantId={effectiveTenantId}
          platformSettings={platformSettings}
          returnNav={navState}
        />
        <CheckoutEnvioRequiredModal
          open={envioRequiredModalOpen}
          onClose={() => setEnvioRequiredModalOpen(false)}
          returnNav={navState}
        />
      </div>
    )
  }

  return (
    <ConfiguracionesSubpageLayout title={pageTitle} backTo={returnTo} backLabel={returnLabel}>
      <section className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-[var(--cat-surface)] shadow-[0_1px_0_color-mix(in_srgb,var(--cat-text)_4%,transparent)]">
        <div className="border-b border-neutral-200/50 bg-gradient-to-br from-neutral-50/90 via-[var(--cat-surface)] to-[color-mix(in_srgb,var(--cat-accent)_5%,var(--cat-surface))] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200/60 bg-white text-[var(--cat-text)] shadow-sm">
              <IconLink size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.1rem] font-medium leading-snug tracking-tight text-[var(--cat-text)] sm:text-[1.25rem]">
                {tenant.nombreTienda}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)] sm:text-[13px]">
                Enlace público de tu catálogo online.
              </p>
            </div>
          </div>

          {catalogoListo ? (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Listo para compartir
            </span>
          ) : (
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-1 text-[11px] font-medium text-amber-900">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
              Completá cobro y envío para activar
            </span>
          )}
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/60 px-3.5 py-3 sm:px-4 sm:py-3.5">
            <p className="break-all font-mono text-[12px] leading-relaxed text-[var(--cat-text)] sm:text-[13px]">
              {catalogoUrlAbsolute}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              className="mc-btn-primary inline-flex flex-1 items-center justify-center gap-2 py-3 text-[15px]"
              disabled={!catalogoUrlAbsolute}
              onClick={() => void copiarUrlCatalogo()}
            >
              <IconClipboard size={17} />
              {copiedCatalogo ? '¡Copiado!' : 'Copiar enlace'}
            </button>
            <a
              href={catalogoUrlAbsolute || '#'}
              target={catalogoListo ? '_blank' : undefined}
              rel={catalogoListo ? 'noreferrer' : undefined}
              className="mc-btn-secondary inline-flex flex-1 items-center justify-center py-3 text-[15px] no-underline"
              onClick={(e) => {
                if (catalogoListo) return
                e.preventDefault()
                void solicitarAccesoCatalogo()
              }}
            >
              Ver catálogo
            </a>
          </div>

          {!catalogoListo && (
            <div className="mt-4 space-y-3 rounded-xl border border-amber-200/55 bg-amber-50/35 px-4 py-3.5">
              <p className="text-[13px] leading-relaxed text-amber-950">
                Para que tus clientes puedan comprar, completá estos pasos:
              </p>
              <ul className="space-y-2">
                {!ventasOk && (
                  <li>
                    <Link
                      to="/app/cuenta/checkout-ventas"
                      state={navState}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/50 bg-white/70 px-3 py-2.5 text-[13px] font-medium text-[var(--cat-text)] no-underline transition hover:bg-white"
                    >
                      Elegí cómo cobrás
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                        Ir →
                      </span>
                    </Link>
                  </li>
                )}
                {!envioOk && (
                  <li>
                    <Link
                      to="/app/cuenta/envio"
                      state={navState}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/50 bg-white/70 px-3 py-2.5 text-[13px] font-medium text-[var(--cat-text)] no-underline transition hover:bg-white"
                    >
                      Configurá el envío
                      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-800">
                        Ir →
                      </span>
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {msg && <p className="mt-3 text-[14px] text-[var(--cat-text)] opacity-90">{msg}</p>}
        </div>
      </section>

      <div className="mc-card mt-6 space-y-4">
        <div>
          <h2 className="ios-headline text-[var(--cat-text)]">Tab de ofertas</h2>
          <p className="ios-footnote mt-1.5 max-w-xl leading-relaxed text-[var(--cat-muted)]">
            Mostrá un tab en tu catálogo con todos los productos que tengan descuento. Podés personalizar el nombre
            (por ejemplo «Remate» o «Liquidación»).
          </p>
        </div>

        <McToggleSwitch
          id="mc-descuentos-tab-enabled"
          checked={descuentosTabEnabled}
          disabled={descuentosTabBusy}
          onChange={setDescuentosTabEnabled}
          label="Mostrar tab de descuentos en la tienda"
          description="Los clientes verán un tab junto a «Todos» con los artículos en oferta."
        />

        {descuentosTabEnabled && (
          <div>
            <label
              htmlFor="mc-descuentos-tab-label"
              className="ios-footnote font-medium text-[var(--cat-text)] opacity-80"
            >
              Nombre del tab
            </label>
            <input
              id="mc-descuentos-tab-label"
              className="mc-input mt-1.5"
              value={descuentosTabLabel}
              maxLength={32}
              disabled={descuentosTabBusy}
              placeholder="Descuento"
              onChange={(e) => setDescuentosTabLabel(e.target.value)}
            />
            <p className="ios-footnote mt-1.5 text-[var(--cat-muted)]">
              Si lo dejás vacío, se mostrará «Descuento».
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="mc-btn-primary px-5 py-2.5 text-[15px]"
            disabled={descuentosTabBusy}
            onClick={() => void guardarDescuentosTab()}
          >
            {descuentosTabBusy ? 'Guardando…' : 'Guardar tab de ofertas'}
          </button>
          {descuentosTabErr && (
            <p className="text-[14px] text-red-800" aria-live="polite">
              {descuentosTabErr}
            </p>
          )}
        </div>
      </div>

      <CheckoutVentasRequiredModal
        open={ventasRequiredModalOpen}
        onClose={() => setVentasRequiredModalOpen(false)}
        context="dashboard"
        tenant={tenant}
        tenantId={effectiveTenantId}
        platformSettings={platformSettings}
        returnNav={navState}
      />
      <CheckoutEnvioRequiredModal
        open={envioRequiredModalOpen}
        onClose={() => setEnvioRequiredModalOpen(false)}
        returnNav={navState}
      />
    </ConfiguracionesSubpageLayout>
  )
}
