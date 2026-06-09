import { useCatalogTenantContext } from '@/public/CatalogTenantContext'
import { usePublicStore } from '@/public/PublicStoreContext'
import { usePublicTenant } from '@/public/usePublicTenant'

/** Tenant del catálogo: contexto de preview (admin) o resolución pública por slug. */
export function useCatalogTenant() {
  const previewCtx = useCatalogTenantContext()
  const { slug } = usePublicStore()
  const publicState = usePublicTenant(previewCtx?.isPreview ? undefined : slug)

  if (previewCtx?.isPreview) {
    return {
      tenantId: previewCtx.tenantId,
      tenant: previewCtx.tenant,
      platformSettings: previewCtx.platformSettings,
      loading: previewCtx.loading,
      error: previewCtx.error,
      isPreview: true as const,
    }
  }

  return {
    ...publicState,
    isPreview: false as const,
  }
}
