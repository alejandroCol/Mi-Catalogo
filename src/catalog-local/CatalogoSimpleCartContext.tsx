import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  addOrMergeSimpleLine,
  clearSimpleCart,
  loadSimpleCart,
  saveSimpleCart,
  setSimpleLineQty,
} from '@/catalog-local/simpleCartStorage'
import type { LineaCarritoSimple } from '@/catalog-local/simpleCartTypes'

type Ctx = {
  lines: LineaCarritoSimple[]
  totalPiezas: number
  /** Subtotal COP (suma de precioUnitarioCop × cantidad). */
  subtotalCop: number
  /** Id de producto cuya línea debe animarse brevemente tras `add`. */
  highlightProductId: string | null
  /** Se incrementa en cada `add` para animar el badge del carrito. */
  cartBumpGeneration: number
  add: (line: LineaCarritoSimple, opts?: { deferBadgeMs?: number }) => void
  updateQty: (productId: string, cantidad: number, varianteId?: string, tallaId?: string) => void
  removeLine: (productId: string, varianteId?: string, tallaId?: string) => void
  /** Reemplaza el carrito (p. ej. recuperación de carrito abandonado). */
  restoreLines: (lines: LineaCarritoSimple[]) => void
  clear: () => void
}

const CatalogoSimpleCartContext = createContext<Ctx | null>(null)

export function CatalogoSimpleCartProvider({
  children,
  storageKey,
}: {
  children: ReactNode
  storageKey: string
}) {
  const [lines, setLines] = useState<LineaCarritoSimple[]>(() => loadSimpleCart(storageKey))
  const [highlightProductId, setHighlightProductId] = useState<string | null>(null)
  const [cartBumpGeneration, setCartBumpGeneration] = useState(0)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  const add = useCallback(
    (line: LineaCarritoSimple, opts?: { deferBadgeMs?: number }) => {
      setLines((prev) => {
        const next = addOrMergeSimpleLine(prev, line)
        saveSimpleCart(storageKey, next)
        return next
      })
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      setHighlightProductId(line.productId)
      const bump = () => setCartBumpGeneration((g) => g + 1)
      const deferMs = opts?.deferBadgeMs ?? 0
      if (deferMs > 0) {
        setTimeout(bump, deferMs)
      } else {
        bump()
      }
      highlightTimerRef.current = setTimeout(() => {
        setHighlightProductId(null)
        highlightTimerRef.current = null
      }, 520)
    },
    [storageKey],
  )

  const updateQty = useCallback(
    (productId: string, cantidad: number, varianteId?: string, tallaId?: string) => {
      setLines((prev) => {
        const next = setSimpleLineQty(prev, productId, cantidad, varianteId, tallaId)
        saveSimpleCart(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const removeLine = useCallback(
    (productId: string, varianteId?: string, tallaId?: string) => {
      setLines((prev) => {
        const next = setSimpleLineQty(prev, productId, 0, varianteId, tallaId)
        saveSimpleCart(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const restoreLines = useCallback(
    (nextLines: LineaCarritoSimple[]) => {
      saveSimpleCart(storageKey, nextLines)
      setLines(nextLines)
    },
    [storageKey],
  )

  const clear = useCallback(() => {
    clearSimpleCart(storageKey)
    setLines([])
  }, [storageKey])

  const totalPiezas = useMemo(() => lines.reduce((s, l) => s + l.cantidad, 0), [lines])
  const subtotalCop = useMemo(
    () =>
      lines.reduce((s, l) => {
        const unit = typeof l.precioUnitarioCop === 'number' ? l.precioUnitarioCop : 0
        return s + Math.max(0, unit) * l.cantidad
      }, 0),
    [lines],
  )

  const value = useMemo(
    () => ({
      lines,
      totalPiezas,
      subtotalCop,
      highlightProductId,
      cartBumpGeneration,
      add,
      updateQty,
      removeLine,
      restoreLines,
      clear,
    }),
    [
      lines,
      totalPiezas,
      subtotalCop,
      highlightProductId,
      cartBumpGeneration,
      add,
      updateQty,
      removeLine,
      restoreLines,
      clear,
    ],
  )

  return <CatalogoSimpleCartContext.Provider value={value}>{children}</CatalogoSimpleCartContext.Provider>
}

export function useCatalogoSimpleCart() {
  const ctx = useContext(CatalogoSimpleCartContext)
  if (!ctx) throw new Error('useCatalogoSimpleCart fuera de provider')
  return ctx
}
