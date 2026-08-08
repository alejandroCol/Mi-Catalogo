import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { formatCop } from '@/lib/formatCop'
import { firebaseConfigured } from '@/lib/firebase'
import {
  buildWishlistManageUrl,
  buildWishlistPath,
  buildWishlistPublicUrl,
  getCatalogWishlistDetailed,
  getOrCreateWishlistSessionToken,
  setStoredWishlistId,
  setWishlistSessionToken,
  wishlistCallableErrorMessage,
  wishlistItemPendingQty,
  type WishlistPublicView,
} from '@/lib/wishlist'
import { useCatalogTenant } from '@/public/useCatalogTenant'
import { usePublicStore } from '@/public/PublicStoreContext'
import { CreateWishlistPanel } from '@/public/wishlist/CreateWishlistPanel'
import { canUseWebShare, shareSafe } from '@/lib/webShare'

/**
 * Panel de la dueña de la lista.
 * Se abre con `/lista/:id/gestionar?k=sessionToken` (link privado, no para amigos).
 */
export function PublicWishlistManagePage() {
  const { wishlistId: wishlistIdParam } = useParams()
  const wishlistId = wishlistIdParam?.trim() || ''
  const [searchParams] = useSearchParams()
  const manageKey = searchParams.get('k')?.trim() || ''
  const { slug, to } = usePublicStore()
  const navigate = useNavigate()
  const { tenant, loading: tenantLoading } = useCatalogTenant()

  const [list, setList] = useState<WishlistPublicView | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [copiedFriends, setCopiedFriends] = useState(false)
  const [copiedAdmin, setCopiedAdmin] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!slug || !wishlistId || !firebaseConfigured) {
      setLoading(false)
      setError('Lista no disponible.')
      return
    }
    if (manageKey.length >= 16) {
      setWishlistSessionToken(slug, manageKey)
      setStoredWishlistId(slug, wishlistId)
    }
    const token = manageKey.length >= 16 ? manageKey : getOrCreateWishlistSessionToken(slug)
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const result = await getCatalogWishlistDetailed(slug, wishlistId, token)
        if (cancelled) return
        setList(result.wishlist)
        setCanManage(result.canManage)
        setError(result.canManage ? null : 'Este link no tiene permiso para administrar la lista.')
      } catch (e) {
        if (!cancelled) {
          setList(null)
          setCanManage(false)
          setError(wishlistCallableErrorMessage(e, 'No encontramos esta lista.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, wishlistId, manageKey, refreshKey])

  const stats = useMemo(() => {
    if (!list) return null
    let desired = 0
    let bought = 0
    for (const item of list.items) {
      desired += item.cantidadDeseada
      bought += Math.min(item.cantidadDeseada, item.compradoCantidad ?? 0)
    }
    return {
      desired,
      bought,
      pending: Math.max(0, desired - bought),
      pct: desired > 0 ? Math.round((bought / desired) * 100) : 0,
    }
  }, [list])

  const friendsUrl = slug && wishlistId ? buildWishlistPublicUrl(slug, wishlistId) : ''
  const adminUrl =
    slug && wishlistId && manageKey.length >= 16
      ? buildWishlistManageUrl(slug, wishlistId, manageKey)
      : slug && wishlistId
        ? buildWishlistManageUrl(slug, wishlistId, getOrCreateWishlistSessionToken(slug))
        : ''

  async function copiar(url: string, kind: 'friends' | 'admin') {
    if (!url || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(url)
    if (kind === 'friends') {
      setCopiedFriends(true)
      window.setTimeout(() => setCopiedFriends(false), 2000)
    } else {
      setCopiedAdmin(true)
      window.setTimeout(() => setCopiedAdmin(false), 2000)
    }
  }

  async function compartirAmigos() {
    if (!friendsUrl || !list) return
    const ok = await shareSafe({
      title: list.titulo,
      text: `Lista de regalos de ${list.destinatarioNombre}`,
      url: friendsUrl,
    })
    if (!ok) await copiar(friendsUrl, 'friends')
  }

  if (tenantLoading || loading) {
    return <p className="py-16 text-center text-sm text-[var(--cat-muted)]">Cargando…</p>
  }

  if (error && !canManage) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mc-pc-display text-xl font-semibold text-[var(--cat-text)]">No podés administrar aquí</h1>
        <p className="mt-2 text-sm text-[var(--cat-muted)]">{error}</p>
        <p className="mt-3 text-[13px] text-[var(--cat-muted)]">
          Usá el <strong className="font-semibold text-[var(--cat-text)]">link de administrar</strong> (el que
          termina en <code className="text-[12px]">/gestionar?k=…</code>), no el link de amigos.
        </p>
        {wishlistId ? (
          <Link
            to={to(buildWishlistPath(wishlistId))}
            className="mc-pc-btn mt-6 inline-flex bg-[var(--cat-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
          >
            Ver lista pública
          </Link>
        ) : null}
      </div>
    )
  }

  if (!list || !stats) return null

  if (editing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[13px] font-medium text-[var(--cat-muted)] underline"
        >
          ← Volver al panel
        </button>
        <div className="mt-4">
          <CreateWishlistPanel
            items={list.items}
            onClose={() => setEditing(false)}
            onCreated={() => {
              setEditing(false)
              setRefreshKey((k) => k + 1)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--cat-muted)]">
        <Link to={to('/')} className="font-medium text-[var(--cat-text)] hover:opacity-70">
          {tenant?.nombreTienda || 'Tienda'}
        </Link>
        <span aria-hidden>/</span>
        <Link to={to('/favoritos')} className="font-medium text-[var(--cat-text)] hover:opacity-70">
          Favoritos
        </Link>
        <span aria-hidden>/</span>
        <span>Administrar lista</span>
      </nav>

      <header className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cat-muted)]">
          Solo vos · no compartir
        </p>
        <h1 className="mc-pc-display mt-1.5 text-2xl font-semibold tracking-tight text-[var(--cat-text)] sm:text-3xl">
          {list.titulo}
        </h1>
        <p className="mt-2 text-sm text-[var(--cat-muted)]">
          Acá ves qué regalaron y podés editar o volver a compartir.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)] bg-[var(--cat-surface)] px-4 py-5">
        <p className="text-[13px] text-[var(--cat-muted)]">
          {stats.bought === 0
            ? 'Todavía nadie compró un regalo.'
            : stats.pending === 0
              ? '¡Completaron toda la lista!'
              : `${stats.bought} regalado${stats.bought === 1 ? '' : 's'} · quedan ${stats.pending}`}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--cat-muted)_14%,transparent)]">
          <div
            className="h-full rounded-full bg-[var(--cat-accent)] transition-[width]"
            style={{ width: `${stats.pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] tabular-nums text-[var(--cat-muted)]">
          {stats.pct}% · {stats.bought}/{stats.desired}
        </p>

        <ul className="mt-4 space-y-2">
          {list.items.map((item) => {
            const pending = wishlistItemPendingQty(item)
            const bought = item.compradoCantidad ?? 0
            const done = pending <= 0
            return (
              <li
                key={`${item.productId}:${item.varianteId || ''}:${item.tallaId || ''}`}
                className="flex items-center gap-3 rounded-xl bg-[color-mix(in_srgb,var(--cat-bg)_55%,var(--cat-surface)_45%)] px-2.5 py-2"
              >
                <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--cat-muted)_10%,transparent)]">
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
                        ? `Quedan ${pending}`
                        : item.precioUnitarioCop
                          ? formatCop(item.precioUnitarioCop)
                          : 'Pendiente'}
                  </span>
                </span>
                <span className={done ? 'text-emerald-700' : 'text-[var(--cat-muted)]'}>
                  {done ? '✓' : '·'}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-6 space-y-3">
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--cat-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--cat-accent)_6%,var(--cat-surface)_94%)] px-4 py-4">
          <p className="text-[12px] font-semibold text-[var(--cat-text)]">Link para tus amigos</p>
          <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
            Este es el que mandás por WhatsApp. Ellos compran el regalo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void (canUseWebShare() ? compartirAmigos() : copiar(friendsUrl, 'friends'))}
              className="mc-pc-btn bg-[var(--cat-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-accent-text)]"
            >
              {canUseWebShare() ? 'Compartir con amigos' : copiedFriends ? 'Copiado' : 'Copiar link amigos'}
            </button>
            {canUseWebShare() ? (
              <button
                type="button"
                onClick={() => void copiar(friendsUrl, 'friends')}
                className="mc-pc-btn border border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] bg-[var(--cat-surface)] px-4 py-2.5 text-sm font-semibold"
              >
                {copiedFriends ? 'Copiado' : 'Copiar'}
              </button>
            ) : null}
            <Link
              to={to(buildWishlistPath(wishlistId))}
              className="mc-pc-btn px-4 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
            >
              Ver como ellos
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--cat-muted)_30%,transparent)] px-4 py-4">
          <p className="text-[12px] font-semibold text-[var(--cat-text)]">Link para administrar (tuyo)</p>
          <p className="mt-1 text-[12px] text-[var(--cat-muted)]">
            Guardalo en notas o mandátelo al celular. No se lo pases a tus amigos.
          </p>
          <button
            type="button"
            onClick={() => void copiar(adminUrl, 'admin')}
            className="mc-pc-btn mt-3 border border-[color-mix(in_srgb,var(--cat-muted)_24%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-text)]"
          >
            {copiedAdmin ? 'Link de admin copiado' : 'Copiar link de administrar'}
          </button>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mc-pc-btn border border-[color-mix(in_srgb,var(--cat-text)_16%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--cat-text)]"
        >
          Editar lista
        </button>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="mc-pc-btn px-4 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
        >
          Actualizar estado
        </button>
        <button
          type="button"
          onClick={() => navigate(to('/favoritos'))}
          className="mc-pc-btn px-4 py-2.5 text-sm font-medium text-[var(--cat-muted)]"
        >
          Ir a Favoritos
        </button>
      </div>
    </div>
  )
}
