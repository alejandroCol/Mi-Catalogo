import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
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
  add: (line: LineaCarritoSimple) => void
  updateQty: (productId: string, cantidad: number) => void
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

  const add = useCallback(
    (line: LineaCarritoSimple) => {
      setLines((prev) => {
        const next = addOrMergeSimpleLine(prev, line)
        saveSimpleCart(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const updateQty = useCallback(
    (productId: string, cantidad: number) => {
      setLines((prev) => {
        const next = setSimpleLineQty(prev, productId, cantidad)
        saveSimpleCart(storageKey, next)
        return next
      })
    },
    [storageKey],
  )

  const clear = useCallback(() => {
    clearSimpleCart(storageKey)
    setLines([])
  }, [storageKey])

  const totalPiezas = useMemo(() => lines.reduce((s, l) => s + l.cantidad, 0), [lines])

  const value = useMemo(
    () => ({ lines, totalPiezas, add, updateQty, clear }),
    [lines, totalPiezas, add, updateQty, clear],
  )

  return <CatalogoSimpleCartContext.Provider value={value}>{children}</CatalogoSimpleCartContext.Provider>
}

export function useCatalogoSimpleCart() {
  const ctx = useContext(CatalogoSimpleCartContext)
  if (!ctx) throw new Error('useCatalogoSimpleCart fuera de provider')
  return ctx
}
