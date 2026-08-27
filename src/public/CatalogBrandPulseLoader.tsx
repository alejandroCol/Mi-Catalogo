import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { readCachedCatalogBrandLogo, readCachedCatalogBrandRound } from '@/lib/catalogBrandLogoCache'
import { catalogHeaderLogoIsRound } from '@/lib/catalogHeaderLayout'
import type { McTenant } from '@/types/mc'

function monogram(name: string | null | undefined): string {
  const t = name?.trim()
  if (!t) return '•'
  const ch = t[0]!
  return /[a-zA-ZÀ-ÿ0-9]/.test(ch) ? ch.toUpperCase() : '•'
}

type BrandPulseValue = {
  logoUrl: string | null
  storeName: string | null
  round: boolean
}

const BrandPulseContext = createContext<BrandPulseValue | null>(null)

export function CatalogBrandPulseProvider({
  tenant,
  slug,
  children,
}: {
  tenant: McTenant | null | undefined
  slug?: string | null
  children: ReactNode
}) {
  const value = useMemo((): BrandPulseValue => {
    const cachedRound = readCachedCatalogBrandRound(slug)
    const round = tenant ? catalogHeaderLogoIsRound(tenant) : (cachedRound ?? true)
    return {
      logoUrl: tenant?.storeLogoUrl || readCachedCatalogBrandLogo(slug) || null,
      storeName: tenant?.nombreTienda || slug || null,
      round,
    }
  }, [slug, tenant?.storeLogoUrl, tenant?.nombreTienda, tenant?.headerLayout, tenant?.headerLogoShape])

  return <BrandPulseContext.Provider value={value}>{children}</BrandPulseContext.Provider>
}

export function useCatalogBrandPulse(): BrandPulseValue | null {
  return useContext(BrandPulseContext)
}

type Props = {
  logoUrl?: string | null
  storeName?: string | null
  /** Círculo (clásico / redondo) vs proporción original del archivo. */
  round?: boolean
}

/** Loader de marca: CSS only, GPU (transform/opacity), respeta reduced-motion. */
export function CatalogBrandPulseLoader({ logoUrl, storeName, round = true }: Props) {
  const [broken, setBroken] = useState(false)
  const showImg = Boolean(logoUrl) && !broken

  return (
    <div
      className={clsx('mc-brand-pulse', round ? 'mc-brand-pulse--round' : 'mc-brand-pulse--original')}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <span className="mc-brand-pulse__glow" aria-hidden />
      <span
        className={clsx('mc-brand-pulse__mark', round ? 'mc-brand-pulse__mark--round' : 'mc-brand-pulse__mark--original')}
      >
        {showImg ? (
          <img
            src={logoUrl!}
            alt=""
            decoding="async"
            draggable={false}
            onError={() => setBroken(true)}
          />
        ) : (
          <span className="mc-brand-pulse__letter">{monogram(storeName)}</span>
        )}
      </span>
      <span className="sr-only">Cargando</span>
    </div>
  )
}
