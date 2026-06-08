import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconPerson } from '@/icons/McIcons'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'

export function StoreImpersonationBanner() {
  const nav = useNavigate()
  const { isImpersonating, impersonation, tenant, stopStoreImpersonation } = useMcAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!isImpersonating || !tenant) return null

  const label = impersonation?.tenantName || tenant.nombreTienda
  const slug = impersonation?.tenantSlug || tenant.slug

  async function handleStop() {
    setBusy(true)
    setErr(null)
    const res = await stopStoreImpersonation()
    setBusy(false)
    if (!res.ok) {
      setErr(res.message)
      return
    }
    nav('/superadmin', { replace: true })
  }

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-300/70 bg-gradient-to-r from-amber-50 via-amber-50/95 to-orange-50/90 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-amber-950 sm:mt-0">
            <IconPerson size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-amber-950">
              Modo soporte · viendo como tienda
            </p>
            <p className="truncate text-[12px] text-amber-900/90">
              <span className="font-medium">{label}</span>
              {slug ? (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={buildStorePublicUrl(slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-amber-400/80 underline-offset-2 hover:text-amber-950"
                  >
                    /{slug}
                  </a>
                </>
              ) : null}
            </p>
            {err ? (
              <p className="mt-1 text-[11px] leading-snug text-red-800">{err}</p>
            ) : (
              <p className="mt-0.5 hidden text-[11px] text-amber-800/80 sm:block">
                Tus acciones quedan registradas. Salí cuando termines de reproducir el caso.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 self-end rounded-lg border border-amber-400/80 bg-white/90 px-3.5 py-2 text-[13px] font-semibold text-amber-950 shadow-sm transition hover:bg-white disabled:opacity-60 sm:self-center"
          disabled={busy}
          onClick={() => void handleStop()}
        >
          {busy ? 'Saliendo…' : 'Salir del modo soporte'}
        </button>
      </div>
    </div>
  )
}
