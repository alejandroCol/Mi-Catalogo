import clsx from 'clsx'
import type { ReactNode } from 'react'
import { IconWhatsApp } from '@/icons/McIcons'
import { resolveStoreSocialLinks, type StoreSocialLinkId } from '@/lib/storeBrandFooter'
import type { McTenant } from '@/types/mc'

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" />
    </svg>
  )
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14.5 8.5H16.5V5.75C16.5 5.75 15.1 5.5 13.75 5.5C10.95 5.5 9 7.35 9 10.65V13H6.5V16H9V22.5H12.5V16H15.25L15.75 13H12.5V11C12.5 9.85 12.85 8.5 14.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SOCIAL_ICON: Record<StoreSocialLinkId, (props: { className?: string }) => ReactNode> = {
  whatsapp: ({ className }) => <IconWhatsApp className={className} size={18} />,
  instagram: IconInstagram,
  facebook: IconFacebook,
}

export function StoreBrandSocialLinks({
  tenant,
  className,
  compact,
}: {
  tenant: McTenant | null | undefined
  className?: string
  /** En el pie compacto del footer. */
  compact?: boolean
}) {
  const links = resolveStoreSocialLinks(tenant)
  if (links.length === 0) return null

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center justify-center gap-2.5',
        compact ? 'sm:justify-end' : 'gap-3',
        className,
      )}
      aria-label="Redes sociales de la tienda"
    >
      {links.map((link) => {
        const Icon = SOCIAL_ICON[link.id]
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={clsx(
              'inline-flex items-center justify-center rounded-full border transition duration-200 ease-in-out',
              'border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] bg-[var(--cat-surface)] text-[var(--cat-text)]',
              'hover:border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--cat-accent)_8%,var(--cat-surface)_92%)]',
              compact ? 'h-9 w-9' : 'h-10 w-10 gap-2 px-4 sm:w-auto',
            )}
          >
            <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
            {!compact ? (
              <span className="hidden text-[13px] font-medium sm:inline">{link.label}</span>
            ) : null}
          </a>
        )
      })}
    </div>
  )
}
