import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured } from '@/lib/firebase'
import {
  buildWishlistManagePath,
  buildWishlistPublicUrl,
  getCatalogWishlist,
  getOrCreateWishlistSessionToken,
  getStoredWishlistId,
  parseWishlistLinkFromInput,
  setStoredWishlistId,
  setWishlistSessionToken,
  wishlistCallableErrorMessage,
  wishlistItemPendingQty,
  type WishlistPublicView,
} from '@/lib/wishlist'
import { usePublicStore } from '@/public/PublicStoreContext'
import { canUseWebShare, shareSafe } from '@/lib/webShare'

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V8M3.5 12h17" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8c-1.6-2.4-3.8-3.2-5.2-2.4S4.8 8.4 7 9.5C8.4 10.2 10.4 9.6 12 8zm0 0c1.6-2.4 3.8-3.2 5.2-2.4s1.8 2.8-.4 4C15.6 10.2 13.6 9.6 12 8z"
      />
    </svg>
  )
}

type Props = {
  /** Se incrementa para forzar recarga (ej. tras crear lista). */
  refreshKey?: number
}

export function MyWishlistFollowUpCard({ refreshKey = 0 }: Props) {
  const { slug, to } = usePublicStore()
  const [wishlistId, setWishlistId] = useState<string | null>(() =>
    slug ? getStoredWishlistId(slug) : null,
  )
  const [list, setList] = useState<WishlistPublicView | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverInput, setRecoverInput] = useState('')
  const [recoverBusy, setRecoverBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(
    async (id: string) => {
      if (!slug || !firebaseConfigured) return
      setLoading(true)
      setError(null)
      try {
        const data = await getCatalogWishlist(slug, id)
        setList(data)
        setWishlistId(id)
      } catch (e) {
        setList(null)
        setError(wishlistCallableErrorMessage(e, 'No encontramos esa lista.'))
      } finally {
        setLoading(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    if (!slug) return
    const id = getStoredWishlistId(slug)
    setWishlistId(id)
    if (id) void load(id)
    else {
      setList(null)
      setError(null)
    }
  }, [slug, refreshKey, load])

  const stats = useMemo(() => {
    if (!list) return null
    let desired = 0
    let bought = 0
    for (const item of list.items) {
      desired += item.cantidadDeseada
      bought += Math.min(item.cantidadDeseada, item.compradoCantidad ?? 0)
    }
    const pending = Math.max(0, desired - bought)
    const pct = desired > 0 ? Math.round((bought / desired) * 100) : 0
    return { desired, bought, pending, pct }
  }, [list])

  const shareUrl = slug && wishlistId ? buildWishlistPublicUrl(slug, wishlistId) : ''
  const managePath =
    slug && wishlistId
      ? buildWishlistManagePath(wishlistId, getOrCreateWishlistSessionToken(slug))
      : ''

  async function copiarAmigos() {
    if (!shareUrl || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function compartir() {
    if (!shareUrl || !list) return
    const ok = await shareSafe({
      title: list.titulo,
      text: `Lista de regalos de ${list.destinatarioNombre}`,
      url: shareUrl,
    })
    if (!ok) await copiarAmigos()
  }

  async function recuperar() {
    if (!slug) return
    const parsed = parseWishlistLinkFromInput(recoverInput)
    if (!parsed) {
      setError('Pegá el link de administrar (…/gestionar?k=…) o el de amigos.')
      return
    }
    setRecoverBusy(true)
    setError(null)
    try {
      if (parsed.sessionToken) {
        setWishlistSessionToken(slug, parsed.sessionToken)
      }
      const data = await getCatalogWishlist(slug, parsed.wishlistId, parsed.sessionToken)
      setStoredWishlistId(slug, parsed.wishlistId)
      setWishlistId(parsed.wishlistId)
      setList(data)
      setShowRecover(false)
      setRecoverInput('')
    } catch (e) {
      setError(wishlistCallableErrorMessage(e, 'No encontramos esa lista en esta tienda.'))
    } finally {
      setRecoverBusy(false)
    }
  }

  if (!slug) return null

  if (!wishlistId && !showRecover) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_28%,transparent)] px-4 py-4">
        <p className="text-sm text-[var(--cat-muted)]">
          ¿Ya creaste una lista y borraste el historial del navegador?{' '}
          <button
            type="button"
            className="font-semibold text-[var(--cat-text)] underline underline-offset-2"
            onClick={() => setShowRecover(true)}
          >
            Recuperar con el link
          </button>
        </p>
      </div>
    )
  }

  if (showRecover) {
    return (
      <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_18%,transparent)] bg-[var(--cat-surface)] px-4 py-4">
        <h2 className="text-sm font-semibold text-[var(--cat-text)]">Recuperar mi lista</h2>
        <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
          Preferí pegar el <strong className="font-semibold text-[var(--cat-text)]">link de administrar</strong>{' '}
          (termina en <code className="text-[11px]">/gestionar?k=…</code>). Con el de amigos solo ves el progreso.
        </p>
        <input
          className="mt-3 w-full rounded-xl border border-[color-mix(in_srgb,var(--cat-muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--cat-bg)_50%,var(--cat-surface)_50%)] px-3 py-2.5 text-sm text-[var(--cat-text)] outline-none focus:border-[color-mix(in_srgb,var(--cat-accent)_40%,transparent)]"
          value={recoverInput}
          onChange={(e) => setRecoverInput(e.target.value)}
          placeholder="https://…/lista/xxxxx/gestionar?k=…"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={recoverBusy}
            onClick={() => void recuperar()}
            className="mc-pc-btn bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)] disabled:opacity-40"
          >
            {recoverBusy ? 'Buscando…' : 'Vincular lista'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRecover(false)
              setError(null)
              const id = getStoredWishlistId(slug)
              if (id) void load(id)
            }}
            className="mc-pc-btn px-4 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)]">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--cat-accent)_16%,transparent)] text-[var(--cat-accent)]">
            <GiftIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cat-muted)]">
              Seguimiento de tu lista
            </p>
            {loading && !list ? (
              <p className="mt-1 text-sm text-[var(--cat-muted)]">Cargando…</p>
            ) : error && !list ? (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            ) : list && stats ? (
              <>
                <h2 className="mt-0.5 truncate text-base font-semibold text-[var(--cat-text)]">{list.titulo}</h2>
                <p className="mt-1 text-[13px] text-[var(--cat-muted)]">
                  {stats.bought === 0
                    ? 'Todavía nadie compró un regalo.'
                    : stats.pending === 0
                      ? '¡Completaron toda la lista!'
                      : `${stats.bought} regalado${stats.bought === 1 ? '' : 's'} · quedan ${stats.pending}`}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cat-muted)_16%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[var(--cat-accent)] transition-[width] duration-500"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] tabular-nums text-[var(--cat-muted)]">
                  {stats.pct}% · {stats.bought}/{stats.desired}
                </p>
              </>
            ) : null}
          </div>
        </div>

        {list ? (
          <ul className="mt-4 max-h-44 space-y-2 overflow-y-auto">
            {list.items.map((item) => {
              const pending = wishlistItemPendingQty(item)
              const bought = item.compradoCantidad ?? 0
              const done = pending <= 0
              return (
                <li
                  key={`${item.productId}:${item.varianteId || ''}:${item.tallaId || ''}`}
                  className="flex items-center gap-2.5 rounded-xl bg-[var(--cat-surface)]/80 px-2.5 py-2"
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--cat-muted)_10%,transparent)]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--cat-text)]">
                      {item.titulo}
                    </span>
                    <span className="text-[11px] text-[var(--cat-muted)]">
                      {done
                        ? 'Ya lo regalaron'
                        : bought > 0
                          ? `${bought} regalado${bought === 1 ? '' : 's'} · quedan ${pending}`
                          : item.precioUnitarioCop
                            ? formatCop(item.precioUnitarioCop)
                            : 'Pendiente'}
                    </span>
                  </span>
                  <span
                    className={
                      done
                        ? 'shrink-0 text-[11px] font-semibold text-emerald-700'
                        : 'shrink-0 text-[11px] font-medium text-[var(--cat-muted)]'
                    }
                  >
                    {done ? '✓' : '·'}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {managePath ? (
            <Link
              to={to(managePath)}
              className="mc-pc-btn bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
            >
              Administrar
            </Link>
          ) : null}
          {shareUrl ? (
            <button
              type="button"
              onClick={() => void (canUseWebShare() ? compartir() : copiarAmigos())}
              className="mc-pc-btn border border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] bg-[var(--cat-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-text)]"
            >
              {canUseWebShare() ? 'Compartir con amigos' : copied ? 'Copiado' : 'Copiar link amigos'}
            </button>
          ) : null}
          {wishlistId ? (
            <button
              type="button"
              onClick={() => void load(wishlistId)}
              className="mc-pc-btn px-3 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
            >
              Actualizar
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowRecover(true)}
            className="mc-pc-btn px-3 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
          >
            Recuperar…
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--cat-muted)]">
          <strong className="font-semibold text-[var(--cat-text)]">Administrar</strong> es para vos (celular/PC).{' '}
          <strong className="font-semibold text-[var(--cat-text)]">Compartir con amigos</strong> es el link de compra.
          Guardá el de administrar en notas.
        </p>
      </div>
    </div>
  )
}
