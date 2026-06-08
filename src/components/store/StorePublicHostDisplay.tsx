import clsx from 'clsx'
import { mcPlatformPublicHost } from '@/lib/storePublicUrl'

type Props = {
  /** Host completo, ej. `mitienda.micatalogo.io`. */
  host: string
  className?: string
  /** `inline` en párrafos; `highlight` con fondo suave; `prominent` en tarjetas de vista previa. */
  variant?: 'inline' | 'highlight' | 'prominent'
}

function splitStorePublicHost(host: string): { slug: string; domain: string } {
  const domain = mcPlatformPublicHost()
  const suffix = `.${domain}`
  const trimmed = host.trim()
  if (trimmed.endsWith(suffix)) {
    return { slug: trimmed.slice(0, -suffix.length), domain }
  }
  const dot = trimmed.indexOf('.')
  if (dot > 0) {
    return { slug: trimmed.slice(0, dot), domain: trimmed.slice(dot + 1) }
  }
  return { slug: trimmed, domain }
}

export function StorePublicHostDisplay({ host, className, variant = 'inline' }: Props) {
  const { slug, domain } = splitStorePublicHost(host)

  const slugClass = clsx(
    'font-semibold tracking-tight text-mc-900',
    variant === 'prominent' && 'text-[15px] sm:text-[16px]',
    variant !== 'prominent' && 'text-[13px]',
  )
  const domainClass = clsx(
    'font-medium text-mc-500',
    variant === 'prominent' ? 'text-[14px] sm:text-[15px]' : 'text-[13px]',
  )

  const content = (
    <span className="inline-flex flex-wrap items-baseline gap-0 leading-snug">
      <span className={slugClass}>{slug}</span>
      <span className={domainClass}>.{domain}</span>
    </span>
  )

  if (variant === 'highlight') {
    return (
      <span
        className={clsx(
          'inline-flex max-w-full rounded-md border border-amber-200/80 bg-white/90 px-2 py-0.5 align-baseline shadow-[0_1px_0_rgba(0,0,0,0.03)]',
          className,
        )}
      >
        {content}
      </span>
    )
  }

  if (variant === 'prominent') {
    return (
      <span
        className={clsx(
          'inline-flex max-w-full rounded-lg border border-neutral-200/70 bg-white px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.04)]',
          className,
        )}
      >
        {content}
      </span>
    )
  }

  return <span className={clsx('inline-flex max-w-full align-baseline', className)}>{content}</span>
}
