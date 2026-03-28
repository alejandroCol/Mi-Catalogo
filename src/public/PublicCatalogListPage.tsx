import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { FullscreenImageOverlay } from '@/catalog-local/FullscreenImageOverlay'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { resolvePublicCatalogTheme } from '@/lib/catalogTheme'
import { mcProductosCollection } from '@/lib/mcCollections'
import { formatCop } from '@/lib/formatCop'
import type { McCatalogThemePreset } from '@/types/mc'
import type { McProducto } from '@/types/mc'
import { usePublicTenant } from '@/public/usePublicTenant'

const INTRO =
  'Entrá a cada artículo, descargá fotos y sumá unidades o docenas al carrito. Pedido por WhatsApp.'

function CatalogIntro({ preset }: { preset: McCatalogThemePreset }) {
  if (preset === 'minimal') {
    return (
      <div className="border-l-4 border-[var(--cat-accent)] pl-4">
        <h1 className="mc-pc-display text-left text-2xl font-semibold tracking-tight mc-pc-text sm:text-3xl">Catálogo</h1>
        <p className="mt-2 max-w-xl text-pretty text-sm leading-relaxed mc-pc-muted sm:text-base">{INTRO}</p>
      </div>
    )
  }
  if (preset === 'bold') {
    return (
      <div className="text-center">
        <h1 className="mc-pc-display text-3xl font-black tracking-tight mc-pc-text sm:text-4xl">Catálogo</h1>
        <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed mc-pc-muted sm:text-base">{INTRO}</p>
      </div>
    )
  }
  if (preset === 'boutique') {
    return (
      <div className="text-center">
        <h1 className="mc-pc-display text-2xl font-semibold italic mc-pc-text sm:text-3xl">Catálogo</h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed mc-pc-muted sm:text-base">{INTRO}</p>
      </div>
    )
  }
  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="mc-pc-display text-2xl font-semibold tracking-tight mc-pc-text sm:text-3xl">Catálogo</h1>
      <p className="mt-3 text-pretty text-sm leading-relaxed mc-pc-muted sm:text-base">{INTRO}</p>
    </div>
  )
}

function Thumb({
  img,
  alt,
  onZoom,
  className,
}: {
  img?: string
  alt: string
  onZoom: () => void
  className?: string
}) {
  if (img) {
    return (
      <button
        type="button"
        className={`relative cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset mc-pc-ring-focus ${className ?? ''}`}
        onClick={onZoom}
        aria-label={`Ver foto de ${alt} en pantalla completa`}
      >
        <img src={img} alt="" className="pointer-events-none h-full w-full object-cover" loading="lazy" />
      </button>
    )
  }
  return (
    <div className={`flex items-center justify-center text-xs mc-pc-muted ${className ?? ''}`}>Sin foto</div>
  )
}

export function PublicCatalogListPage() {
  const { slug } = useParams<{ slug: string }>()
  const { tenantId, tenant, loading, error } = usePublicTenant(slug)
  const [rows, setRows] = useState<(McProducto & { id: string })[]>([])
  const [previewImg, setPreviewImg] = useState<{ src: string; alt: string } | null>(null)

  const preset = tenant ? resolvePublicCatalogTheme(tenant).preset : 'morning'

  useEffect(() => {
    if (!firebaseConfigured || !tenantId) return
    const db = getDb()
    const q = query(
      collection(db, mcProductosCollection(tenantId)),
      where('activo', '==', true),
      where('enCatalogo', '==', true),
      orderBy('orden', 'asc'),
    )
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McProducto, 'id'>) })))
    })
  }, [tenantId])

  const ordenadas = useMemo(() => rows, [rows])

  if (!firebaseConfigured) {
    return (
      <p className="mx-auto max-w-md px-2 py-12 text-center text-sm leading-relaxed mc-pc-text">
        Configurá Firebase.
      </p>
    )
  }
  if (loading) {
    return <p className="text-center mc-pc-muted">Cargando…</p>
  }
  if (error || !tenant || !slug) {
    return <p className="text-center text-sm text-red-600">{error ?? 'No disponible'}</p>
  }

  function cardRowIosMorning(p: McProducto & { id: string }) {
    const img = p.imageUrl
    return (
      <div
        key={p.id}
        className="group mc-pc-card flex overflow-hidden border mc-pc-border mc-pc-surface shadow-sm transition hover:shadow-md"
      >
        <div className="relative h-28 w-28 shrink-0 mc-pc-image-placeholder sm:h-32 sm:w-32">
          <Thumb
            img={img}
            alt={p.nombre}
            onZoom={() => setPreviewImg({ src: img!, alt: p.nombre })}
            className="h-full w-full"
          />
        </div>
        <Link
          to={`/c/${slug}/p/${p.id}`}
          className="flex min-w-0 flex-1 flex-col justify-center p-3 text-left transition hover:opacity-90"
        >
          <p className="mc-pc-display font-semibold mc-pc-text">{p.nombre}</p>
          <p className="mt-1 text-sm font-medium tabular-nums mc-pc-text">{formatCop(p.precioCop)}</p>
          <p className="text-xs mc-pc-muted">{p.stock > 0 ? `Stock ${p.stock}` : 'Consultar stock'}</p>
        </Link>
      </div>
    )
  }

  function cardMinimal(p: McProducto & { id: string }) {
    const img = p.imageUrl
    return (
      <div key={p.id} className="flex gap-3 py-4 first:pt-0 sm:gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px] mc-pc-image-placeholder sm:h-[4.5rem] sm:w-[4.5rem]">
          {img ? (
            <Thumb
              img={img}
              alt={p.nombre}
              onZoom={() => setPreviewImg({ src: img, alt: p.nombre })}
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] mc-pc-muted">—</div>
          )}
        </div>
        <Link to={`/c/${slug}/p/${p.id}`} className="min-w-0 flex-1 py-0.5 transition hover:opacity-90">
          <p className="mc-pc-display text-[15px] font-semibold leading-snug mc-pc-text sm:text-base">{p.nombre}</p>
          <p className="mt-1 text-sm font-medium tabular-nums mc-pc-text">{formatCop(p.precioCop)}</p>
          <p className="mt-0.5 text-xs mc-pc-muted">{p.stock > 0 ? `Stock ${p.stock}` : 'Consultar stock'}</p>
        </Link>
      </div>
    )
  }

  function cardBold(p: McProducto & { id: string }) {
    const img = p.imageUrl
    return (
      <div
        key={p.id}
        className="overflow-hidden rounded-2xl border mc-pc-border bg-[var(--cat-surface)] shadow-sm transition hover:shadow-lg"
      >
        <div className="relative aspect-[4/3] w-full mc-pc-image-placeholder">
          {img ? (
            <button
              type="button"
              className="relative h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset mc-pc-ring-focus"
              onClick={() => setPreviewImg({ src: img, alt: p.nombre })}
              aria-label={`Ver foto de ${p.nombre}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ) : (
            <div className="flex h-full items-center justify-center text-sm mc-pc-muted">Sin foto</div>
          )}
        </div>
        <Link to={`/c/${slug}/p/${p.id}`} className="block px-4 py-5 text-center sm:px-6 sm:py-6">
          <p className="mc-pc-display text-xl font-bold leading-tight mc-pc-text sm:text-2xl">{p.nombre}</p>
          <p className="mt-2 text-lg font-semibold tabular-nums mc-pc-text sm:text-xl">{formatCop(p.precioCop)}</p>
          <p className="mt-2 text-sm mc-pc-muted">{p.stock > 0 ? `Stock ${p.stock}` : 'Consultar stock'}</p>
        </Link>
      </div>
    )
  }

  function cardBoutique(p: McProducto & { id: string }) {
    const img = p.imageUrl
    return (
      <div
        key={p.id}
        className="mc-pc-card flex flex-col overflow-hidden border mc-pc-border mc-pc-surface shadow-sm transition hover:shadow-md"
      >
        <div className="relative aspect-[3/4] w-full mc-pc-image-placeholder">
          {img ? (
            <button
              type="button"
              className="relative h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset mc-pc-ring-focus"
              onClick={() => setPreviewImg({ src: img, alt: p.nombre })}
              aria-label={`Ver foto de ${p.nombre}`}
            >
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ) : (
            <div className="flex h-full items-center justify-center text-xs mc-pc-muted">Sin foto</div>
          )}
        </div>
        <Link
          to={`/c/${slug}/p/${p.id}`}
          className="flex flex-1 flex-col justify-center px-2 pb-3 pt-2 text-center sm:px-3"
        >
          <p className="mc-pc-display line-clamp-2 text-[13px] font-semibold leading-snug mc-pc-text sm:text-sm">
            {p.nombre}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold tabular-nums mc-pc-text sm:text-[13px]">
            {formatCop(p.precioCop)}
          </p>
          <p className="mt-1 text-[10px] mc-pc-muted sm:text-[11px]">
            {p.stock > 0 ? `${p.stock} disp.` : 'Stock'}
          </p>
        </Link>
      </div>
    )
  }

  let listBody: ReactNode
  if (preset === 'minimal') {
    listBody = (
      <div className="divide-y mc-pc-border">
        {ordenadas.map((p) => cardMinimal(p))}
      </div>
    )
  } else if (preset === 'bold') {
    listBody = <div className="space-y-8 sm:space-y-10">{ordenadas.map((p) => cardBold(p))}</div>
  } else if (preset === 'boutique') {
    listBody = (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">{ordenadas.map((p) => cardBoutique(p))}</div>
    )
  } else {
    listBody = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{ordenadas.map((p) => cardRowIosMorning(p))}</div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <CatalogIntro preset={preset} />

      <section className="scroll-mt-4">
        {preset !== 'minimal' && (
          <h2 className="mc-pc-display mb-4 text-lg font-semibold mc-pc-text sm:text-xl">
            {preset === 'bold' ? 'Todo el catálogo' : preset === 'boutique' ? 'Colección' : 'Productos'}
          </h2>
        )}
        {listBody}
        {ordenadas.length === 0 && <p className="text-sm mc-pc-muted">Aún no hay artículos en el catálogo.</p>}
      </section>

      <FullscreenImageOverlay
        src={previewImg?.src ?? null}
        alt={previewImg?.alt ?? ''}
        open={previewImg != null}
        onClose={() => setPreviewImg(null)}
      />
    </div>
  )
}
