import { resolveStoreAbout } from '@/lib/storeBrandFooter'
import type { McTenant } from '@/types/mc'

export function StoreBrandAboutSection({ tenant }: { tenant: McTenant | null | undefined }) {
  const about = resolveStoreAbout(tenant)
  if (!about) return null

  return (
    <section
      className="mc-store-about border-t mc-pc-border bg-[color-mix(in_srgb,var(--cat-surface)_92%,var(--cat-bg)_8%)] py-10 sm:py-12"
      aria-labelledby="store-about-heading"
    >
      <div className="mc-public-catalog-inset mx-auto max-w-2xl">
        <header className="text-center">
          <h2
            id="store-about-heading"
            className="mc-pc-display text-[1.125rem] font-semibold tracking-tight text-[var(--cat-text)] sm:text-[1.25rem]"
          >
            {about.title}
          </h2>
        </header>

        <p className="mt-5 whitespace-pre-wrap text-center text-[14px] leading-[1.7] mc-pc-muted sm:text-[15px]">
          {about.body}
        </p>

        {about.extraBody ? (
          <>
            <div
              className="mx-auto my-7 flex max-w-xs items-center gap-3"
              aria-hidden
            >
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_55%,var(--cat-muted)_45%)]" />
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)]" />
            </div>
            {about.extraTitle ? (
              <h3 className="mc-pc-display text-center text-[15px] font-medium tracking-tight text-[var(--cat-text)] sm:text-base">
                {about.extraTitle}
              </h3>
            ) : null}
            <p
              className={`whitespace-pre-wrap text-center text-[14px] leading-[1.7] mc-pc-muted sm:text-[15px] ${
                about.extraTitle ? 'mt-3' : ''
              }`}
            >
              {about.extraBody}
            </p>
          </>
        ) : null}
      </div>
    </section>
  )
}
