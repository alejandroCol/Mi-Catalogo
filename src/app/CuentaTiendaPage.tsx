import { useEffect, useMemo, useState } from 'react'
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { ConfiguracionesBackLink, ConfiguracionesSubpageLayout } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { McToggleSwitch } from '@/components/McToggleSwitch'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { CatalogPublishPanel } from '@/components/catalog/CatalogPublishPanel'
import { isCatalogPubliclyAccessible } from '@/lib/catalogPublish'
import { IconClipboard, IconLink } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import type { McPlatformSettings } from '@/types/mc'

export function CuentaTiendaPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, fromOutsideConfig } = useConfigSubpageNav()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [copiedCatalogo, setCopiedCatalogo] = useState(false)
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

  const catalogoPublico = tenant ? isCatalogPubliclyAccessible(tenant) : false
  async function copiarUrlCatalogo() {
    if (!catalogoPublico) return
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
          <h1 className="ios-large-title">Publicá tu catálogo</h1>
          <p className="ios-footnote max-w-lg leading-relaxed text-[var(--cat-muted)]">
            Último paso: activá Expert, publicá tu tienda y compartí el enlace con tus clientes.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-[var(--cat-surface)] px-4 py-5 sm:px-6 sm:py-6">
          <CatalogPublishPanel
            tenant={tenant}
            platformSettings={platformSettings}
            catalogoUrl={catalogoUrlAbsolute}
          />
          {catalogoPublico ? (
            <button
              type="button"
              className="mc-btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 text-[15px]"
              onClick={() => void copiarUrlCatalogo()}
            >
              <IconClipboard size={17} />
              {copiedCatalogo ? '¡Copiado!' : 'Copiar enlace público'}
            </button>
          ) : null}
        </section>

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
                Publicá tu tienda con Expert o explorá cómo se ve en vista previa.
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">
          <CatalogPublishPanel
            tenant={tenant}
            platformSettings={platformSettings}
            catalogoUrl={catalogoUrlAbsolute}
          />

          {catalogoPublico ? (
            <button
              type="button"
              className="mc-btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 text-[15px] sm:w-auto"
              disabled={!catalogoUrlAbsolute}
              onClick={() => void copiarUrlCatalogo()}
            >
              <IconClipboard size={17} />
              {copiedCatalogo ? '¡Copiado!' : 'Copiar enlace público'}
            </button>
          ) : null}

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

    </ConfiguracionesSubpageLayout>
  )
}
