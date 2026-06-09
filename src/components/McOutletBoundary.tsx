import { Suspense, type ReactNode } from 'react'
import { McPageLoadingFallback } from '@/components/McPageLoadingFallback'
import { McPublicPageLoadingFallback } from '@/components/McPublicPageLoadingFallback'
import { McRouteErrorBoundary } from '@/components/McRouteErrorBoundary'

type McOutletBoundaryVariant = 'app' | 'public'

/**
 * Suspense + error boundary alrededor de <Outlet />.
 * Evita que un lazy route desmonte el shell (tab bar, header de tienda, etc.).
 */
export function McOutletBoundary({
  children,
  variant = 'app',
}: {
  children: ReactNode
  variant?: McOutletBoundaryVariant
}) {
  const fallback = variant === 'public' ? <McPublicPageLoadingFallback /> : <McPageLoadingFallback />

  return (
    <McRouteErrorBoundary>
      <Suspense fallback={fallback}>{children}</Suspense>
    </McRouteErrorBoundary>
  )
}
