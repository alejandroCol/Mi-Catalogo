import clsx from 'clsx'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { getLandingDemoStore } from '@/lib/landingDemoStore'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'

type Props = {
  className?: string
  fullWidth?: boolean
}

/** CTA de la landing que abre la tienda demo configurada por súper admin. */
export function LandingDemoStoreButton({ className, fullWidth }: Props) {
  const { platformSettings, loading } = usePlatformSettings()
  const demo = getLandingDemoStore(platformSettings)

  if (loading || !demo) return null

  const href = buildStorePublicUrl(demo.slug)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('mc-landing-btn-secondary', fullWidth && 'w-full', className)}
      aria-label={`Ver tienda demo: ${demo.displayName}`}
    >
      <span className="mc-landing-btn__label">
        Ver tienda demo
        <span className="mc-landing-btn__badge">Demo</span>
      </span>
    </a>
  )
}
