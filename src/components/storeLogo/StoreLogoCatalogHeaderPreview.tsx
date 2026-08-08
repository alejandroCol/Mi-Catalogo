import clsx from 'clsx'
import { resolveCatalogHeaderLayout } from '@/lib/catalogHeaderLayout'
import { publicCatalogCssVars, publicCatalogPresetClass, resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  logoUrl: string
}

export function StoreLogoCatalogHeaderPreview({ tenant, logoUrl }: Props) {
  const { preset } = resolvePublicCatalogTheme(tenant)
  const layout = resolveCatalogHeaderLayout(tenant)

  return (
    <div className="rounded-xl border border-neutral-200/80 bg-gradient-to-b from-white to-neutral-50/80 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mc-900/[0.06] text-mc-700">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="ios-footnote font-semibold text-mc-900">Vista previa en tu catálogo</p>
          <p className="mt-1 text-[12px] leading-relaxed text-mc-600">
            {layout === 'logo-center'
              ? 'Así verán tus clientes el logo centrado en la cabecera.'
              : 'Así verán tus clientes el logo junto al nombre de tu tienda en la cabecera.'}
          </p>
        </div>
      </div>

      <div
        className={clsx(
          'mt-4 overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
          publicCatalogPresetClass(preset),
        )}
        style={publicCatalogCssVars(tenant)}
      >
        <div className="mc-pc-elev-header bg-[var(--cat-surface)]">
          {layout === 'logo-center' ? (
            <div className="grid h-[3.5rem] grid-cols-3 items-center gap-2 px-4 sm:h-[4rem]">
              <div className="flex items-center gap-1.5 opacity-40">
                <span className="h-1 w-6 rounded-full bg-[var(--cat-muted)]" />
                <span className="h-1 w-6 rounded-full bg-[var(--cat-muted)]" />
              </div>
              <div className="flex flex-col items-center gap-0.5 justify-self-center">
                <img
                  src={logoUrl}
                  alt=""
                  className="h-7 w-auto max-w-[5.5rem] object-contain sm:h-8"
                />
                <span className="mc-pc-display max-w-full truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-text)] opacity-80">
                  {tenant.nombreTienda}
                </span>
              </div>
              <div className="flex items-center justify-end gap-1.5 opacity-40">
                <span className="h-3.5 w-3.5 rounded-full border border-[var(--cat-muted)]" />
                <span className="h-3.5 w-3.5 rounded-full border border-[var(--cat-muted)]" />
              </div>
            </div>
          ) : (
            <div className="flex h-[3.25rem] items-center gap-2.5 px-4 sm:h-[3.75rem] sm:gap-3">
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-9 sm:w-9"
              />
              <span className="mc-pc-display min-w-0 truncate text-[15px] font-semibold tracking-tight text-[var(--cat-text)] sm:text-base">
                {tenant.nombreTienda}
              </span>
            </div>
          )}
        </div>
        <div className="border-t border-[color-mix(in_srgb,var(--cat-muted)_10%,transparent)] bg-[var(--cat-bg)] px-4 py-3">
          <div className="pointer-events-none select-none opacity-35">
            <div className="flex gap-2.5">
              <div className="h-10 w-10 shrink-0 rounded-md bg-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)]" />
              <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                <div className="h-2 w-4/5 max-w-[140px] rounded bg-[color-mix(in_srgb,var(--cat-text)_22%,transparent)]" />
                <div className="h-1.5 w-12 rounded bg-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
