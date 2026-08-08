import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Link } from 'react-router-dom'
import { useCatalogoSimpleCart } from '@/catalog-local/CatalogoSimpleCartContext'
import { formatCop } from '@/lib/formatCop'
import { resolveShowroomCopy, resolveShowroomMediaType } from '@/lib/collectionShowroom'
import { productoPrecioVenta, productoPrecioVentaDesde } from '@/lib/productoDescuento'
import { tallasValidas } from '@/lib/productoTallas'
import {
  productoStockEfectivo,
  varianteEtiqueta,
  variantesPublicas,
} from '@/lib/productoVariantes'
import { useCatalogFavorites } from '@/public/CatalogFavoritesContext'
import {
  productNeedsShowroomOptions,
  ShowroomQuickAddSheet,
} from '@/public/showroom/ShowroomQuickAddSheet'
import type { McCollectionShowroom, McProducto } from '@/types/mc'

type Props = {
  showroom: McCollectionShowroom
  products: McProducto[]
  productPath: (id: string) => string
  onExit: () => void
  opening?: boolean
}

type SwipeFlash = 'like' | 'nope' | null

const TIP_STORAGE_KEY = 'mc-showroom-swipe-tip-v1'
const SWIPE_THRESHOLD = 88
const SWIPE_MAX = 220

function padIndex(n: number) {
  return String(n).padStart(2, '0')
}

function ShowroomRoomMedia({
  imageUrl,
  videoUrl,
  posterUrl,
  eager,
  dragStyle,
  exitKind,
  tint,
}: {
  imageUrl?: string
  videoUrl?: string | null
  posterUrl?: string
  eager?: boolean
  dragStyle?: CSSProperties
  exitKind?: SwipeFlash
  tint?: number
}) {
  const exitClass =
    exitKind === 'like'
      ? 'is-exit-like'
      : exitKind === 'nope'
        ? 'is-exit-nope'
        : ''

  return (
    <div
      className={`mc-showroom-room__media ${exitClass}`}
      aria-hidden
      style={dragStyle}
    >
      {videoUrl ? (
        <>
          <div className="mc-showroom-room__bleed">
            <video src={videoUrl} poster={posterUrl || imageUrl} muted loop playsInline autoPlay />
          </div>
          <div className="mc-showroom-room__portrait">
            <video src={videoUrl} poster={posterUrl || imageUrl} muted loop playsInline autoPlay />
          </div>
        </>
      ) : imageUrl ? (
        <>
          <div className="mc-showroom-room__bleed">
            <img src={imageUrl} alt="" loading={eager ? 'eager' : 'lazy'} />
          </div>
          <div className="mc-showroom-room__portrait">
            <img src={imageUrl} alt="" loading={eager ? 'eager' : 'lazy'} />
          </div>
        </>
      ) : (
        <div className="mc-showroom-room__void" />
      )}
      {tint && Math.abs(tint) > 0.08 ? (
        <div
          className={`mc-showroom-room__tint ${tint > 0 ? 'is-like' : 'is-nope'}`}
          style={{ opacity: Math.min(0.28, Math.abs(tint) * 0.28) }}
        />
      ) : null}
    </div>
  )
}

function addProductDirect(
  add: ReturnType<typeof useCatalogoSimpleCart>['add'],
  p: McProducto,
) {
  const vars = variantesPublicas(p)
  const tallas = tallasValidas(p)
  const selectedVariant = vars.length === 1 ? vars[0] : undefined
  const selectedTalla = p.esRopa && tallas.length === 1 ? tallas[0] : undefined
  const tituloParts = [p.nombre]
  if (selectedVariant) tituloParts.push(varianteEtiqueta(selectedVariant))
  if (selectedTalla?.nombre) tituloParts.push(selectedTalla.nombre)
  const imageUrl = selectedVariant?.imageUrl || p.imageUrl
  add({
    productId: p.id,
    ...(selectedVariant ? { varianteId: selectedVariant.id } : {}),
    ...(selectedTalla ? { tallaId: selectedTalla.id } : {}),
    titulo: tituloParts.join(' · '),
    ...(p.referencia ? { referencia: p.referencia } : {}),
    precioUnitarioCop: productoPrecioVenta(p, selectedVariant),
    ...(imageUrl ? { imageUrl } : {}),
    cantidad: 1,
  })
}

export function ShowroomHallway({
  showroom,
  products,
  productPath,
  onExit,
}: Props) {
  const copy = resolveShowroomCopy(showroom)
  const { add } = useCatalogoSimpleCart()
  const { isFavorite, toggleFavorite } = useCatalogFavorites()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [entered, setEntered] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set())
  const [swipeFlash, setSwipeFlash] = useState<SwipeFlash>(null)
  const [exitKind, setExitKind] = useState<SwipeFlash>(null)
  const [exitProductId, setExitProductId] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [tipVisible, setTipVisible] = useState(false)
  const [quickAddProduct, setQuickAddProduct] = useState<McProducto | null>(null)
  const touchRef = useRef<{ x: number; y: number; locked: 'h' | 'v' | null } | null>(null)
  const flashTimer = useRef<number | null>(null)
  const pendingAdvanceRef = useRef<number | null>(null)
  const dragXRef = useRef(0)
  const exitLockRef = useRef(false)
  const activeProductRef = useRef<McProducto | null>(null)
  const activeIndexRef = useRef(0)
  const lastTapRef = useRef<{ t: number; id: string; x: number; y: number } | null>(null)

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const hallway = useMemo(
    () =>
      (showroom.productIds ?? [])
        .map((id) => byId.get(id))
        .filter((p): p is McProducto => Boolean(p) && !dismissedIds.has(p!.id)),
    [showroom.productIds, byId, dismissedIds],
  )
  const atelierIds =
    showroom.atelierProductIds && showroom.atelierProductIds.length > 0
      ? showroom.atelierProductIds
      : (showroom.productIds ?? []).slice(0, 3)
  const atelier = atelierIds
    .map((id) => byId.get(id))
    .filter((p): p is McProducto => Boolean(p) && !dismissedIds.has(p!.id))

  const teaserType = resolveShowroomMediaType(showroom)
  const introImage =
    teaserType === 'video'
      ? showroom.teaserPosterUrl || showroom.teaserImageUrl || hallway[0]?.imageUrl
      : showroom.teaserImageUrl || hallway[0]?.imageUrl
  const introVideo =
    teaserType === 'video' && showroom.teaserVideoUrl ? showroom.teaserVideoUrl : null

  const totalChapters = hallway.length + 1
  const chapterLabel =
    activeIndex === 0
      ? 'Inicio'
      : activeIndex > hallway.length
        ? 'Atelier'
        : `${padIndex(activeIndex)} / ${padIndex(hallway.length)}`

  const activeProduct =
    activeIndex >= 1 && activeIndex <= hallway.length ? hallway[activeIndex - 1]! : null

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 40)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(TIP_STORAGE_KEY) === '1') return
    } catch {
      /* ignore */
    }
    const show = window.setTimeout(() => setTipVisible(true), 900)
    const hide = window.setTimeout(() => {
      setTipVisible(false)
      try {
        sessionStorage.setItem(TIP_STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }, 5200)
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current)
    }
  }, [])

  useEffect(() => {
    const root = scrollerRef.current
    if (!root) return

    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'))
    if (sections.length === 0) return

    const sync = () => {
      const max = root.scrollHeight - root.clientHeight
      setProgress(max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0)

      let bestIdx = 0
      let best = -1
      sections.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        const rootRect = root.getBoundingClientRect()
        const visible =
          Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top)
        const ratio = visible / Math.max(1, rootRect.height)
        if (ratio > best) {
          best = ratio
          bestIdx = i
        }

        const center = rootRect.top + rootRect.height * 0.5
        const elCenter = rect.top + rect.height * 0.5
        const offset = (elCenter - center) / rootRect.height
        const media = el.querySelector<HTMLElement>('.mc-showroom-room__media')
        if (media && !dragging) {
          const shift = Math.max(-18, Math.min(18, offset * -28))
          const scale = 1.08 - Math.min(0.06, Math.abs(offset) * 0.08)
          media.style.transform = `translate3d(0, ${shift}px, 0) scale(${scale})`
        }
      })
      setActiveIndex(bestIdx)
    }

    sync()
    root.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      root.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [hallway.length, dragging])

  const dismissTip = useCallback(() => {
    setTipVisible(false)
    try {
      sessionStorage.setItem(TIP_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [])

  function scrollToChapter(index: number) {
    const root = scrollerRef.current
    if (!root) return
    const el = root.querySelector<HTMLElement>(`[data-chapter="${index}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function flash(kind: SwipeFlash, then?: () => void) {
    setSwipeFlash(kind)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => {
      setSwipeFlash(null)
      then?.()
    }, kind === 'like' ? 680 : 520)
  }

  function favoritePulse(product: McProducto) {
    dismissTip()
    if (!isFavorite(product.id)) toggleFavorite(product.id)
    flash('like')
    setDragX(0)
    dragXRef.current = 0
    setDragging(false)
  }

  function commitSwipe(kind: 'like' | 'nope', product: McProducto) {
    if (exitLockRef.current) return
    exitLockRef.current = true
    dismissTip()
    setExitKind(kind)
    setExitProductId(product.id)
    setDragging(false)
    setDragX(kind === 'like' ? SWIPE_MAX : -SWIPE_MAX)
    dragXRef.current = kind === 'like' ? SWIPE_MAX : -SWIPE_MAX

    if (kind === 'like') {
      if (!isFavorite(product.id)) toggleFavorite(product.id)
      flash('like', () => {
        setExitKind(null)
        setExitProductId(null)
        setDragX(0)
        dragXRef.current = 0
        exitLockRef.current = false
      })
      return
    }

    flash('nope', () => {
      pendingAdvanceRef.current = activeIndexRef.current
      setDismissedIds((prev) => {
        const next = new Set(prev)
        next.add(product.id)
        return next
      })
      setExitKind(null)
      setExitProductId(null)
      setDragX(0)
      dragXRef.current = 0
      exitLockRef.current = false
    })
  }

  useEffect(() => {
    if (pendingAdvanceRef.current == null) return
    const idx = pendingAdvanceRef.current
    pendingAdvanceRef.current = null
    const maxChapter = hallway.length + 1
    scrollToChapter(Math.min(Math.max(1, idx), maxChapter))
  }, [dismissedIds, hallway.length])

  function requestAdd(p: McProducto) {
    dismissTip()
    if (productNeedsShowroomOptions(p)) {
      setQuickAddProduct(p)
      return
    }
    addProductDirect(add, p)
    setAddedId(p.id)
    window.setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 1400)
  }

  function onAddedFromSheet(productId: string) {
    setAddedId(productId)
    window.setTimeout(() => setAddedId((cur) => (cur === productId ? null : cur)), 1400)
  }

  activeProductRef.current = activeProduct
  activeIndexRef.current = activeIndex

  useEffect(() => {
    const root = scrollerRef.current
    const product = activeProduct
    if (!root || !product) return
    const room = root.querySelector<HTMLElement>(
      `[data-chapter][data-product-id="${CSS.escape(product.id)}"]`,
    )
    if (!room) return

    const begin = (x: number, y: number) => {
      if (exitLockRef.current) return
      touchRef.current = { x, y, locked: null }
      setDragging(true)
    }

    const move = (x: number, y: number, e?: Event) => {
      if (!touchRef.current || exitLockRef.current) return
      const dx = x - touchRef.current.x
      const dy = y - touchRef.current.y

      if (!touchRef.current.locked) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        touchRef.current.locked = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'h' : 'v'
        if (touchRef.current.locked === 'v') {
          setDragging(false)
          setDragX(0)
          dragXRef.current = 0
          return
        }
      }
      if (touchRef.current.locked !== 'h') return
      e?.preventDefault()
      const next = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, dx))
      dragXRef.current = next
      setDragX(next)
    }

    const end = (clientX?: number, clientY?: number) => {
      if (exitLockRef.current) {
        touchRef.current = null
        return
      }
      const current = activeProductRef.current
      const start = touchRef.current
      const dx = dragXRef.current
      const locked = start?.locked
      setDragging(false)
      touchRef.current = null
      if (!current) {
        setDragX(0)
        dragXRef.current = 0
        return
      }
      if (dx >= SWIPE_THRESHOLD) {
        lastTapRef.current = null
        commitSwipe('like', current)
        return
      }
      if (dx <= -SWIPE_THRESHOLD) {
        lastTapRef.current = null
        commitSwipe('nope', current)
        return
      }

      // Tap / doble tap (sin swipe horizontal)
      const x = clientX ?? start?.x ?? 0
      const y = clientY ?? start?.y ?? 0
      const moved =
        start != null ? Math.hypot(x - start.x, y - start.y) : 0
      if (locked === 'h' || moved > 28) {
        setDragX(0)
        dragXRef.current = 0
        return
      }

      const now = Date.now()
      const last = lastTapRef.current
      if (
        last &&
        last.id === current.id &&
        now - last.t < 320 &&
        Math.hypot(x - last.x, y - last.y) < 36
      ) {
        lastTapRef.current = null
        favoritePulse(current)
        setDragX(0)
        dragXRef.current = 0
        return
      }

      lastTapRef.current = { t: now, id: current.id, x, y }
      setDragX(0)
      dragXRef.current = 0
    }

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false
      return Boolean(target.closest('button, a, input, textarea, select, label'))
    }

    const onTouchStart = (e: TouchEvent) => {
      if (isInteractiveTarget(e.target)) return
      const t = e.touches[0]
      if (!t) return
      begin(t.clientX, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      move(t.clientX, t.clientY, e)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (isInteractiveTarget(e.target) && !touchRef.current) return
      const t = e.changedTouches[0]
      end(t?.clientX, t?.clientY)
    }
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      if (e.button !== 0) return
      if (isInteractiveTarget(e.target)) return
      begin(e.clientX, e.clientY)
      room.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      move(e.clientX, e.clientY, e)
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      end(e.clientX, e.clientY)
    }
    const onDblClick = (e: MouseEvent) => {
      if (isInteractiveTarget(e.target)) return
      const current = activeProductRef.current
      if (!current || exitLockRef.current) return
      e.preventDefault()
      favoritePulse(current)
    }

    room.addEventListener('touchstart', onTouchStart, { passive: true })
    room.addEventListener('touchmove', onTouchMove, { passive: false })
    room.addEventListener('touchend', onTouchEnd)
    room.addEventListener('touchcancel', onTouchEnd)
    room.addEventListener('pointerdown', onPointerDown)
    room.addEventListener('pointermove', onPointerMove)
    room.addEventListener('pointerup', onPointerUp)
    room.addEventListener('pointercancel', onPointerUp)
    room.addEventListener('dblclick', onDblClick)
    return () => {
      room.removeEventListener('touchstart', onTouchStart)
      room.removeEventListener('touchmove', onTouchMove)
      room.removeEventListener('touchend', onTouchEnd)
      room.removeEventListener('touchcancel', onTouchEnd)
      room.removeEventListener('pointerdown', onPointerDown)
      room.removeEventListener('pointermove', onPointerMove)
      room.removeEventListener('pointerup', onPointerUp)
      room.removeEventListener('pointercancel', onPointerUp)
      room.removeEventListener('dblclick', onDblClick)
    }
  }, [activeProduct?.id, isFavorite, toggleFavorite, dismissTip])

  const dragOpacity = Math.min(1, Math.abs(dragX) / SWIPE_THRESHOLD)
  const dragRotate = dragX * 0.028
  const dragScale = 1.01 + Math.min(0.02, Math.abs(dragX) / 2800)
  const dragTint = (dragX / SWIPE_THRESHOLD) * 0.7

  return (
    <div
      className={`mc-showroom-hall ${entered ? 'mc-showroom-hall--in' : ''}`}
      data-mood={copy.mood}
    >
      <div className="mc-showroom-hall__progress" aria-hidden>
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      <header className="mc-showroom-hall__chrome">
        <button type="button" className="mc-showroom-hall__back" onClick={onExit}>
          Cerrar
        </button>
        <p className="mc-showroom-hall__chapter">{chapterLabel}</p>
        <p className="mc-showroom-hall__brand">{copy.collectionTitle}</p>
      </header>

      <nav className="mc-showroom-hall__dots" aria-label="Piezas de la colección">
        {Array.from({ length: totalChapters + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`mc-showroom-hall__dot ${activeIndex === i ? 'is-active' : ''}`}
            aria-label={
              i === 0 ? 'Inicio' : i > hallway.length ? 'Atelier' : `Pieza ${i}`
            }
            onClick={() => scrollToChapter(i)}
          />
        ))}
      </nav>

      {tipVisible ? (
        <button type="button" className="mc-showroom-tip" role="note" onClick={dismissTip}>
          <span>← No</span>
          <span className="mc-showroom-tip__sep" aria-hidden />
          <span>♥ / → Favorito</span>
        </button>
      ) : null}

      {(swipeFlash || (dragging && Math.abs(dragX) > 28)) && activeProduct ? (
        <div
          className={`mc-showroom-swipe-badge ${
            swipeFlash === 'like' || (!swipeFlash && dragX > 0) ? 'is-like' : 'is-nope'
          } ${swipeFlash ? 'is-pop' : ''}`}
          style={
            swipeFlash
              ? undefined
              : {
                  opacity: Math.min(0.9, dragOpacity * 0.9),
                  transform: `translate(-50%, -50%) scale(${0.96 + dragOpacity * 0.04})`,
                }
          }
          aria-live="polite"
        >
          {swipeFlash === 'like' || (!swipeFlash && dragX > 0) ? (
            <>
              <span className="mc-showroom-swipe-badge__heart" aria-hidden>
                ♥
              </span>
              Favorito
            </>
          ) : (
            'No'
          )}
        </div>
      ) : null}

      <div ref={scrollerRef} className="mc-showroom-hall__scroller">
        <section className="mc-showroom-room mc-showroom-room--intro" data-chapter={0}>
          <ShowroomRoomMedia
            imageUrl={introImage}
            videoUrl={introVideo}
            posterUrl={showroom.teaserPosterUrl}
            eager
          />
          <div className="mc-showroom-room__veil" aria-hidden />
          <div className="mc-showroom-room__copy mc-showroom-room__copy--intro">
            <p className="mc-showroom-room__kicker">Colección</p>
            <h1 className="mc-showroom-room__headline">{copy.collectionTitle}</h1>
            <p className="mc-showroom-room__lede">{copy.collectionSubtitle}</p>
            <button
              type="button"
              className="mc-showroom-room__continue"
              onClick={() => scrollToChapter(1)}
            >
              Recorrer
              <span aria-hidden />
            </button>
          </div>
        </section>

        {hallway.map((p, i) => {
          const stock = productoStockEfectivo(p, byId)
          const price = productoPrecioVentaDesde(p)
          const chapter = i + 1
          const isActive = activeIndex === chapter
          const isExiting = exitProductId === p.id && Boolean(exitKind)
          const isDraggingThis = isActive && !isExiting && (dragging || dragX !== 0)
          return (
            <section
              key={p.id}
              className={`mc-showroom-room ${isActive ? 'is-active' : ''} ${isExiting ? 'is-exiting' : ''}`}
              data-chapter={chapter}
              data-product-id={p.id}
            >
              <ShowroomRoomMedia
                imageUrl={p.imageUrl}
                eager={i < 2}
                exitKind={isExiting ? exitKind : null}
                tint={isActive && !isExiting ? dragTint : isExiting ? (exitKind === 'like' ? 1 : -1) : 0}
                dragStyle={
                  isDraggingThis
                    ? {
                        transform: `translate3d(${dragX}px, ${Math.abs(dragX) * 0.04}px, 0) rotate(${dragRotate}deg) scale(${dragScale})`,
                        transition: dragging
                          ? 'none'
                          : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
                      }
                    : undefined
                }
              />
              <div className="mc-showroom-room__veil" aria-hidden />
              <div className="mc-showroom-room__copy">
                <p className="mc-showroom-room__index">
                  {padIndex(chapter)}
                  <span> / {padIndex(hallway.length)}</span>
                  {isFavorite(p.id) ? (
                    <span className="mc-showroom-room__fav-mark"> · Favorito</span>
                  ) : null}
                </p>
                <h2 className="mc-showroom-room__name">{p.nombre}</h2>
                <div className="mc-showroom-room__row">
                  <p className="mc-showroom-room__price">{formatCop(price)}</p>
                  {showroom.showStockLeft !== false && stock > 0 && stock <= 12 ? (
                    <p className="mc-showroom-room__stock">Quedan {stock}</p>
                  ) : null}
                </div>
                <div className="mc-showroom-room__actions">
                  <button
                    type="button"
                    className="mc-showroom-room__add"
                    onClick={() => requestAdd(p)}
                  >
                    {addedId === p.id ? 'En el carrito' : 'Agregar al carrito'}
                  </button>
                  <Link to={productPath(p.id)} className="mc-showroom-room__detail">
                    Ver detalle
                  </Link>
                </div>
              </div>
            </section>
          )
        })}

        <section
          className="mc-showroom-room mc-showroom-room--atelier"
          data-chapter={hallway.length + 1}
          aria-label="Atelier"
        >
          <ShowroomRoomMedia
            imageUrl={atelier[0]?.imageUrl || hallway[0]?.imageUrl}
          />
          <div className="mc-showroom-room__veil mc-showroom-room__veil--heavy" aria-hidden />
          <div className="mc-showroom-room__copy mc-showroom-room__copy--atelier">
            <p className="mc-showroom-room__kicker">Atelier</p>
            <h2 className="mc-showroom-room__headline">{copy.atelierHeadline}</h2>
            <p className="mc-showroom-room__lede">{copy.atelierSubheadline}</p>

            <div className="mc-showroom-look">
              {atelier.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={`mc-showroom-look__piece mc-showroom-look__piece--${i % 3}`}
                  onClick={() => requestAdd(p)}
                >
                  {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span />}
                  <span className="mc-showroom-look__cap">
                    <span className="mc-showroom-look__name">{p.nombre}</span>
                    <span className="mc-showroom-look__price">
                      {formatCop(productoPrecioVentaDesde(p))}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {atelier.length > 0 ? (
              <button
                type="button"
                className="mc-showroom-room__add mc-showroom-room__add--wide"
                onClick={() => {
                  const needing = atelier.filter((p) => productNeedsShowroomOptions(p))
                  atelier
                    .filter((p) => !productNeedsShowroomOptions(p))
                    .forEach((p) => addProductDirect(add, p))
                  if (needing[0]) setQuickAddProduct(needing[0])
                  else if (atelier[0]) {
                    setAddedId(atelier[0].id)
                    window.setTimeout(() => setAddedId(null), 1400)
                  }
                }}
              >
                Llevar el look completo
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <ShowroomQuickAddSheet
        product={quickAddProduct}
        open={Boolean(quickAddProduct)}
        onClose={() => setQuickAddProduct(null)}
        onAdded={onAddedFromSheet}
      />
    </div>
  )
}
