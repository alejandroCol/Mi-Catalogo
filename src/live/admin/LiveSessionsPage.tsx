import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useMcAuth } from '@/auth/McAuthContext'
import { useLiveSessionsList } from '@/live/hooks/useLiveSessionsList'
import { liveCreateSession } from '@/live/lib/liveApi'
import { liveCallableErrorMessage } from '@/live/lib/liveCallableError'
import { IconChevronRight } from '@/icons/McIcons'
import type { McLiveSessionStatus } from '@/types/mc'

function statusLabel(status: McLiveSessionStatus): string {
  switch (status) {
    case 'live':
      return 'En vivo'
    case 'ended':
      return 'Finalizado'
    case 'scheduled':
      return 'Programado'
    default:
      return 'Borrador'
  }
}

function statusClass(status: McLiveSessionStatus): string {
  switch (status) {
    case 'live':
      return 'bg-red-100 text-red-800'
    case 'ended':
      return 'bg-[var(--cat-muted)]/15 text-[var(--cat-muted)]'
    default:
      return 'bg-amber-100 text-amber-900'
  }
}

export function LiveSessionsPage() {
  const { effectiveTenantId } = useMcAuth()
  const { sessions, loading: listLoading } = useLiveSessionsList(effectiveTenantId ?? undefined)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateLive() {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const result = await liveCreateSession('Live de mi tienda', [])
      window.location.assign(`/app/live/${result.sessionId}`)
    } catch (e) {
      setError(liveCallableErrorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mc-shell">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c5a367]">Live shopping</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Vender en vivo</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cat-muted)]">
          Transmití, mostrá productos en pantalla y dejá que tus clientes compren sin salir del live.
        </p>
      </header>

      <button
        type="button"
        onClick={() => void handleCreateLive()}
        disabled={creating}
        className="mc-live-create-btn mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c1b1f] px-5 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#2a2930] disabled:opacity-60"
      >
        <span className="mc-live-pulse-dot scale-75 bg-red-400" />
        {creating ? 'Creando…' : 'Iniciar nuevo live'}
      </button>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[var(--cat-text)]">Tus lives</h2>
        {listLoading ? (
          <p className="text-sm text-[var(--cat-muted)]">Cargando…</p>
        ) : sessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--cat-muted)]/25 p-6 text-center text-sm text-[var(--cat-muted)]">
            Todavía no creaste un live. Tocá «Iniciar nuevo live» para empezar.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/app/live/${s.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--cat-muted)]/15 bg-[var(--cat-surface)] p-4 transition hover:border-[var(--cat-muted)]/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{s.title}</p>
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          statusClass(s.status),
                        )}
                      >
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--cat-muted)]">
                      {s.viewerCount} viewers · {s.purchaseCount} compras
                    </p>
                  </div>
                  <IconChevronRight size={18} className="shrink-0 text-[var(--cat-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
