import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ConfigSubpageNavState } from '@/app/configuraciones/configSubpageNav'
import { IconChevronRight, IconClipboard, IconLink } from '@/icons/McIcons'

type Props = {
  tenantName: string
  catalogoUrl: string
  catalogoListo: boolean
  ventasOk: boolean
  envioOk: boolean
  copied: boolean
  msg: string | null
  navState: ConfigSubpageNavState
  onCopy: () => void
  onOpenCatalog: (e: MouseEvent) => void
}

export function CompartirCatalogoChecklistView({
  tenantName,
  catalogoUrl,
  catalogoListo,
  ventasOk,
  envioOk,
  copied,
  msg,
  navState,
  onCopy,
  onOpenCatalog,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-300/50 bg-gradient-to-br from-[#d8d8d4] via-[#e4e4e0] to-[#cbcbc6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-white/35 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-neutral-400/15 blur-3xl"
        aria-hidden
      />

      <div className="relative overflow-hidden rounded-2xl border border-neutral-900/10 bg-[var(--cat-surface)] shadow-[0_24px_64px_-28px_rgba(0,0,0,0.45)]">
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] px-5 py-6 sm:px-7 sm:py-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_100%_-20%,rgba(251,191,36,0.12),transparent)]"
            aria-hidden
          />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Checklist · paso 4 de 4
          </p>
          <div className="relative mt-4 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]">
              <IconLink size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.2rem] font-medium leading-snug tracking-tight text-white sm:text-[1.35rem]">
                {tenantName}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/62">
                Copiá el enlace y compartilo con tus clientes para empezar a vender.
              </p>
            </div>
          </div>

          {catalogoListo ? (
            <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-medium text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              Listo para compartir
            </span>
          ) : (
            <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-100">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden />
              Completá cobro y envío para activar
            </span>
          )}
        </div>

        <div className="bg-neutral-50/80 px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--cat-muted)]">
            Enlace de tu catálogo
          </p>
          <div className="mt-3 rounded-xl border border-neutral-200/80 bg-white px-4 py-3.5 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.12)] sm:py-4">
            <p className="break-all font-mono text-[13px] leading-relaxed text-[var(--cat-text)] sm:text-[14px]">
              {catalogoUrl}
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              className="mc-btn-primary inline-flex flex-1 items-center justify-center gap-2 py-3.5 text-[15px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]"
              disabled={!catalogoUrl}
              onClick={onCopy}
            >
              <IconClipboard size={18} />
              {copied ? '¡Copiado!' : 'Copiar enlace'}
            </button>
            <a
              href={catalogoUrl || '#'}
              target={catalogoListo ? '_blank' : undefined}
              rel={catalogoListo ? 'noreferrer' : undefined}
              className="mc-btn-secondary inline-flex flex-1 items-center justify-center py-3.5 text-[15px] no-underline"
              onClick={onOpenCatalog}
            >
              Ver catálogo
            </a>
          </div>

          {!catalogoListo && (
            <div className="mt-5 overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/90">
              <div className="border-b border-amber-200/50 bg-amber-100/40 px-4 py-3">
                <p className="text-[13px] font-medium text-amber-950">Falta poco para activar tu tienda</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-amber-900/80">
                  Completá estos pasos y tu catálogo quedará listo para vender.
                </p>
              </div>
              <ul className="divide-y divide-amber-200/45 p-2">
                {!ventasOk && (
                  <li>
                    <Link
                      to="/app/cuenta/checkout-ventas"
                      state={navState}
                      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-[13px] font-medium text-[var(--cat-text)] no-underline transition hover:bg-white/70"
                    >
                      Elegí cómo cobrás
                      <IconChevronRight
                        size={16}
                        className="text-amber-800/60 transition group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                )}
                {!envioOk && (
                  <li>
                    <Link
                      to="/app/cuenta/envio"
                      state={navState}
                      className="group flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-[13px] font-medium text-[var(--cat-text)] no-underline transition hover:bg-white/70"
                    >
                      Configurá el envío
                      <IconChevronRight
                        size={16}
                        className="text-amber-800/60 transition group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {msg && <p className="mt-4 text-[14px] text-red-800">{msg}</p>}
        </div>
      </div>
    </div>
  )
}
