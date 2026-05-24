import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { CartAddFlyOverlay } from '@/public/cart-animation/CartAddFlyOverlay'
import { CART_FLY_DURATION_MS } from '@/public/cart-animation/flyBezier'
import type { CartFlyParticle, CartFlySource } from '@/public/cart-animation/types'
import { usePrefersReducedMotion } from '@/public/cart-animation/usePrefersReducedMotion'

type CartAddAnimationCtx = {
  /** Registra el botón del carrito en el header como destino del vuelo. */
  registerCartTarget: (el: HTMLElement | null) => void
  /** Dispara la animación de vuelo hacia el carrito. */
  playAddToCartFly: (source: CartFlySource) => void
  /** El carrito está recibiendo un ítem (pulso sutil en el icono). */
  cartReceiving: boolean
  /** Partículas activas para el overlay. */
  activeFlies: CartFlyParticle[]
  onFlyComplete: (id: string) => void
}

const CartAddAnimationContext = createContext<CartAddAnimationCtx | null>(null)

let flyIdCounter = 0

function nextFlyId(): string {
  flyIdCounter += 1
  return `cart-fly-${flyIdCounter}`
}

function centerOf(el: HTMLElement): { x: number; y: number } {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export function CartAddAnimationProvider({ children }: { children: ReactNode }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const cartTargetRef = useRef<HTMLElement | null>(null)
  const [activeFlies, setActiveFlies] = useState<CartFlyParticle[]>([])
  const [cartReceiving, setCartReceiving] = useState(false)
  const receivingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const registerCartTarget = useCallback((el: HTMLElement | null) => {
    cartTargetRef.current = el
  }, [])

  const onFlyComplete = useCallback((id: string) => {
    setActiveFlies((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const playAddToCartFly = useCallback(
    (source: CartFlySource) => {
      const target = cartTargetRef.current
      if (!target) return

      if (receivingTimerRef.current) clearTimeout(receivingTimerRef.current)
      setCartReceiving(true)
      receivingTimerRef.current = setTimeout(() => {
        setCartReceiving(false)
        receivingTimerRef.current = null
      }, CART_FLY_DURATION_MS + 80)

      if (prefersReducedMotion) return

      const from = centerOf(source.sourceEl)
      const to = centerOf(target)
      const particle: CartFlyParticle = {
        id: nextFlyId(),
        startX: from.x,
        startY: from.y,
        endX: to.x,
        endY: to.y,
        imageUrl: source.imageUrl,
      }
      setActiveFlies((prev) => [...prev, particle])
    },
    [prefersReducedMotion],
  )

  const value = useMemo(
    () => ({
      registerCartTarget,
      playAddToCartFly,
      cartReceiving,
      activeFlies,
      onFlyComplete,
    }),
    [registerCartTarget, playAddToCartFly, cartReceiving, activeFlies, onFlyComplete],
  )

  return (
    <CartAddAnimationContext.Provider value={value}>
      {children}
      <CartAddFlyOverlay />
    </CartAddAnimationContext.Provider>
  )
}

export function useCartAddAnimation() {
  const ctx = useContext(CartAddAnimationContext)
  if (!ctx) throw new Error('useCartAddAnimation fuera de CartAddAnimationProvider')
  return ctx
}

/** Hook opcional: no falla si el provider no está montado. */
export function useCartAddAnimationOptional() {
  return useContext(CartAddAnimationContext)
}
