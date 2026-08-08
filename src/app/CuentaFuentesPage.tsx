import { useEffect, useMemo, useState } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones'
import { useConfigSubpageNav } from '@/app/configuraciones/configSubpageNav'
import { CatalogFontPickerGrid } from '@/app/CatalogFontPickerGrid'
import { CatalogFontScopeToggle } from '@/app/CatalogFontScopeToggle'
import { doc, updateDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { useSaveSuccess } from '@/components/McSaveSuccessModal'
import { ProductoFormSection } from '@/components/producto/ProductoFormSection'
import {
  CATALOG_FONT_LABELS,
  catalogFontsToCssVars,
  defaultFontIdForPreset,
  normalizeFontScope,
  resolveDraftCatalogFonts,
} from '@/lib/catalogFonts'
import {
  buildCatalogThemeWithFonts,
  catalogColorsToCssVars,
  publicCatalogPresetClass,
  resolveCatalogTheme,
} from '@/lib/catalogTheme'
import { resolveAnnouncementBar } from '@/lib/announcementBar'
import { getDb } from '@/lib/firebase'
import { productSaveErrorMessage } from '@/lib/mcSaveError'
import { MC } from '@/lib/mcCollections'
import { resolveSeasonBanner } from '@/lib/seasonBanner'
import { CatalogAnnouncementBar } from '@/public/CatalogAnnouncementBar'
import { SeasonBannerHero } from '@/public/SeasonBannerHero'
import type { McCatalogFontId, McCatalogFontScope, McTenant } from '@/types/mc'

function previewTenantWithFonts(
  base: McTenant,
  family: McCatalogFontId,
  scope: McCatalogFontScope,
): McTenant {
  return {
    ...base,
    catalogTheme: buildCatalogThemeWithFonts(base.catalogTheme, { family, scope }),
  }
}

function StoreFontPreview({
  tenant,
  family,
  scope,
}: {
  tenant: McTenant
  family: McCatalogFontId
  scope: McCatalogFontScope
}) {
  const { preset, colors } = resolveCatalogTheme(tenant)
  const fonts = resolveDraftCatalogFonts(preset, family, scope)
  const style = {
    ...catalogColorsToCssVars(colors),
    ...catalogFontsToCssVars(fonts),
  }

  return (
    <div
      className={`mc-public-catalog-page overflow-hidden rounded-xl border border-neutral-200/50 ${publicCatalogPresetClass(preset)}`}
      style={style}
    >
      <div className="border-b mc-pc-border bg-[var(--cat-surface)] px-3 py-2.5">
        <p className="mc-pc-display text-[14px] font-semibold tracking-tight text-[var(--cat-text)]">
          {tenant.nombreTienda || 'Tu tienda'}
        </p>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex gap-2 rounded-lg border mc-pc-border bg-[var(--cat-surface)] p-2">
          <div className="h-10 w-10 shrink-0 rounded-md mc-pc-image-placeholder" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <p className="text-[13px] font-medium tracking-tight text-[var(--cat-text)]">Remera oversize</p>
            <p className="text-[11px] text-[var(--cat-muted)]">Algodón premium · 3 colores</p>
          </div>
        </div>
        <div className="flex gap-2 rounded-lg border mc-pc-border bg-[var(--cat-surface)] p-2">
          <div className="h-10 w-10 shrink-0 rounded-md mc-pc-image-placeholder" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <p className="text-[13px] font-medium tracking-tight text-[var(--cat-text)]">Jean wide leg</p>
            <p className="text-[11px] text-[var(--cat-muted)]">Talle 36 al 44</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CuentaFuentesPage() {
  const { tenant, effectiveTenantId } = useMcAuth()
  const { returnTo, returnLabel, navState } = useConfigSubpageNav()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const { showSaveSuccess } = useSaveSuccess()

  const preset = tenant ? resolveCatalogTheme(tenant).preset : 'morning'

  const [family, setFamily] = useState<McCatalogFontId>('inter-tight')
  const [scope, setScope] = useState<McCatalogFontScope>('store')

  useEffect(() => {
    if (!tenant) return
    const saved = tenant.catalogTheme?.fonts
    if (saved?.family) {
      setFamily(saved.family)
      setScope(normalizeFontScope(saved.scope))
      return
    }
    setFamily(defaultFontIdForPreset(tenant.catalogTheme?.preset ?? 'morning'))
    setScope('store')
  }, [tenant])

  const previewTenant = useMemo(
    () => (tenant ? previewTenantWithFonts(tenant, family, scope) : null),
    [tenant, family, scope],
  )

  const bannerContent = previewTenant ? resolveSeasonBanner(previewTenant) : null
  const announcementPreview =
    resolveAnnouncementBar(previewTenant) ??
    ({
      texts: ['Envíos GRATIS desde $250.000', 'Actitud y comodidad en cada movimiento'],
      theme: 'black' as const,
      spacing: 'normal' as const,
    })

  const previewDescription =
    scope === 'store'
      ? 'Así se verán los textos de tu catálogo con la fuente elegida.'
      : scope === 'banner'
        ? 'Así se verán el título y la descripción del banner principal.'
        : 'Así se verá el texto de la barra de anuncio superior.'

  const saveMessage =
    scope === 'store'
      ? `La fuente ${CATALOG_FONT_LABELS[family]} ya se ve en todo tu catálogo.`
      : scope === 'banner'
        ? `La fuente ${CATALOG_FONT_LABELS[family]} ya se ve en el título y descripción del banner.`
        : `La fuente ${CATALOG_FONT_LABELS[family]} ya se ve en la barra de anuncio.`

  async function guardarFuentes() {
    if (!effectiveTenantId || !tenant) return
    setBusy(true)
    setErr(null)
    try {
      await updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        catalogTheme: buildCatalogThemeWithFonts(tenant.catalogTheme, { family, scope }),
      })
      showSaveSuccess({
        title: 'Tipografía actualizada',
        message: saveMessage,
      })
    } catch (saveErr: unknown) {
      setErr(productSaveErrorMessage(saveErr, 'No se pudo guardar la tipografía.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mc-shell mc-config-subpage">
      <div>
        <ConfiguracionesBackLink to={returnTo} label={returnLabel} state={navState} />
        <h1 className="ios-large-title mt-3">Tipografía</h1>
        <p className="ios-subhead mt-2 max-w-xl leading-relaxed text-[var(--cat-muted)]">
          Elegí una fuente que refleje el estilo de tu marca. Podés aplicarla a toda la tienda, al banner
          principal o solo a la barra de anuncio.
        </p>
      </div>

      {!tenant ? (
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando tienda…</p>
      ) : (
        <div className="space-y-4">
          <div className="mc-card space-y-6">
            <ProductoFormSection
              title="Dónde aplicar"
              description="Elegí si la fuente afecta todo el catálogo, el hero de temporada o la barra de anuncio."
            >
              <CatalogFontScopeToggle value={scope} disabled={busy} onChange={setScope} />
            </ProductoFormSection>

            <ProductoFormSection
              title="Estilo tipográfico"
              description="Cinco personalidades distintas. Tocá cada una para ver cómo se lee tu marca."
            >
              <CatalogFontPickerGrid value={family} disabled={busy} onChange={setFamily} />
            </ProductoFormSection>

            <ProductoFormSection title="Vista previa" description={previewDescription}>
              {scope === 'store' ? (
                <StoreFontPreview tenant={tenant} family={family} scope={scope} />
              ) : scope === 'banner' && previewTenant ? (
                <div
                  className={`overflow-hidden rounded-xl border border-neutral-200/50 ${publicCatalogPresetClass(preset)}`}
                  style={{
                    ...catalogColorsToCssVars(resolveCatalogTheme(tenant).colors),
                    ...catalogFontsToCssVars(resolveDraftCatalogFonts(preset, family, scope)),
                  }}
                >
                  <SeasonBannerHero tenant={previewTenant} preview />
                </div>
              ) : scope === 'announcement' ? (
                <div
                  className={`overflow-hidden rounded-xl border border-neutral-200/50 ${publicCatalogPresetClass(preset)}`}
                  style={{
                    ...catalogColorsToCssVars(resolveCatalogTheme(tenant).colors),
                    ...catalogFontsToCssVars(resolveDraftCatalogFonts(preset, family, scope)),
                  }}
                >
                  <CatalogAnnouncementBar bar={announcementPreview} preview />
                  <div className="border-t border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] px-4 py-3">
                    <p className="text-[13px] font-medium text-[var(--cat-text)]">
                      {tenant.nombreTienda || 'Tu tienda'}
                    </p>
                  </div>
                </div>
              ) : null}
              {scope === 'banner' && !bannerContent ? (
                <p className="ios-footnote mt-2 text-[var(--cat-muted)]">
                  Activá el banner de temporada en Personalizar para ver el hero completo en tu catálogo.
                </p>
              ) : null}
              {scope === 'announcement' && !resolveAnnouncementBar(tenant) ? (
                <p className="ios-footnote mt-2 text-[var(--cat-muted)]">
                  Activá la barra de anuncio en Personalizar para verla en tu catálogo. Acá te mostramos una
                  muestra con la fuente elegida.
                </p>
              ) : null}
            </ProductoFormSection>

            {err ? <p className="text-[15px] text-red-800">{err}</p> : null}

            <button type="button" className="mc-btn-primary w-full" disabled={busy} onClick={() => void guardarFuentes()}>
              Guardar tipografía
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
