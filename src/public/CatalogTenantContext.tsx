import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useMcAuth } from '@/auth/McAuthContext'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'
import type { McPlatformSettings, McTenant } from '@/types/mc'

export type CatalogTenantContextValue = {
  tenantId: string | null
  tenant: (McTenant & { id: string }) | null
  platformSettings: McPlatformSettings | null
  loading: boolean
  error: string | null
  isPreview: boolean
}

const CatalogTenantContext = createContext<CatalogTenantContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
  /** Vista previa en admin: carga tenant del dueño autenticado. */
  preview?: boolean
}

export function CatalogTenantProvider({ children, preview = false }: ProviderProps) {
  const { tenant: authTenant, effectiveTenantId } = useMcAuth()
  const [platformSettings, setPlatformSettings] = useState<McPlatformSettings | null>(null)
  const [loading, setLoading] = useState(preview)

  useEffect(() => {
    if (!preview || !firebaseConfigured) {
      setLoading(false)
      return
    }
    void getDoc(doc(getDb(), MC.mcPlatform, MC.mcPlatformSettingsDoc)).then((ps) => {
      setPlatformSettings(ps.exists() ? (ps.data() as McPlatformSettings) : {})
      setLoading(false)
    })
  }, [preview])

  const value: CatalogTenantContextValue = preview
    ? {
        tenantId: effectiveTenantId ?? null,
        tenant: authTenant,
        platformSettings,
        loading: loading || !authTenant,
        error: authTenant ? null : 'No se pudo cargar tu tienda.',
        isPreview: true,
      }
    : {
        tenantId: null,
        tenant: null,
        platformSettings: null,
        loading: false,
        error: null,
        isPreview: false,
      }

  return <CatalogTenantContext.Provider value={value}>{children}</CatalogTenantContext.Provider>
}

export function useCatalogTenantContext(): CatalogTenantContextValue | null {
  return useContext(CatalogTenantContext)
}

export function useIsCatalogPreview(): boolean {
  return useContext(CatalogTenantContext)?.isPreview === true
}
