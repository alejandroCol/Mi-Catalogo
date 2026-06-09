import { useMcAuth } from '@/auth/McAuthContext'
import { CatalogTenantProvider } from '@/public/CatalogTenantContext'
import { PublicStoreProvider } from '@/public/PublicStoreContext'
import { PublicCatalogLayout } from '@/public/PublicCatalogLayout'

export const ADMIN_CATALOG_PREVIEW_BASE = '/app/vista-previa'

export function AdminCatalogPreviewLayout() {
  const { tenant } = useMcAuth()

  if (!tenant?.slug) {
    return (
      <div className="mc-shell flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <p className="text-[15px] text-[var(--cat-muted)]">Cargando…</p>
      </div>
    )
  }

  return (
    <CatalogTenantProvider preview>
      <PublicStoreProvider slugOverride={tenant.slug} adminPreviewBase={ADMIN_CATALOG_PREVIEW_BASE}>
        <PublicCatalogLayout />
      </PublicStoreProvider>
    </CatalogTenantProvider>
  )
}
