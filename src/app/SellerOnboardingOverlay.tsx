import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { useNavigate } from 'react-router-dom'

const STEPS = [
  {
    title: 'Inicio',
    body: 'Acá ves el resumen y los accesos rápidos a lo importante.',
  },
  {
    title: 'Productos',
    body: 'Cargá productos con foto y precio: es lo que ve tu cliente.',
  },
  {
    title: 'Ventas',
    body: 'Anotá pedidos y llevá el control de totales.',
  },
  {
    title: 'Configuraciones',
    body: 'Tu enlace público, checkout y opciones de la tienda.',
  },
] as const

const TAB_PATHS = ['/app', '/app/inventario', '/app/pedidos', '/app/cuenta'] as const

type Hole = { top: number; left: number; right: number; bottom: number }

type Props = {
  open: boolean
  onDismiss: () => void
  tabAnchorsRef: MutableRefObject<(HTMLElement | null)[]>
}

function SpotlightShade({ hole }: { hole: Hole }) {
  const { top, left, right, bottom } = hole
  const dim = 'pointer-events-auto fixed z-0 bg-[rgba(10,10,10,0.52)]'
  return (
    <>
      <div className={dim} style={{ top: 0, left: 0, right: 0, height: top }} aria-hidden />
      <div className={dim} style={{ top, left: 0, width: left, height: bottom - top }} aria-hidden />
      <div className={dim} style={{ top, left: right, right: 0, height: bottom - top }} aria-hidden />
      <div className={dim} style={{ top: bottom, left: 0, right: 0, bottom: 0 }} aria-hidden />
    </>
  )
}

export function SellerOnboardingOverlay({ open, onDismiss, tabAnchorsRef }: Props) {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [hole, setHole] = useState<Hole | null>(null)

  useLayoutEffect(() => {
    if (open) {
      setStep(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    nav(TAB_PATHS[step], { replace: true })
  }, [open, step, nav])

  useLayoutEffect(() => {
    if (!open) {
      setHole(null)
      return
    }
    let raf = 0
    function measure() {
      const el = tabAnchorsRef.current[step]
      if (!el) {
        setHole(null)
        return
      }
      const r = el.getBoundingClientRect()
      const pad = 6
      setHole({
        top: r.top - pad,
        left: r.left - pad,
        right: r.right + pad,
        bottom: r.bottom + pad,
      })
    }
    measure()
    raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [open, step, tabAnchorsRef])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open) {
    return null
  }

  const last = step >= STEPS.length - 1
  const { title, body } = STEPS[step]
  const w = typeof window !== 'undefined' ? window.innerWidth : 400
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  const cx = hole ? (hole.left + hole.right) / 2 : w / 2
  const tooltipTop = hole ? hole.top - 12 : h / 2
  const flipDown = hole ? hole.top < 140 : false

  function primary() {
    if (last) {
      onDismiss()
      nav('/app/inventario', { replace: true })
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal aria-labelledby="mc-onb-title">
      {hole && (
        <>
          <SpotlightShade hole={hole} />
          <div
            className="pointer-events-none fixed z-[1] rounded-xl ring-2 ring-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] motion-safe:animate-[mc-coach-pulse_2.2s_ease-in-out_infinite]"
            style={{
              left: hole.left,
              top: hole.top,
              width: hole.right - hole.left,
              height: hole.bottom - hole.top,
            }}
            aria-hidden
          />
        </>
      )}

      <div
        className="pointer-events-auto fixed z-[2] w-[min(20rem,calc(100vw-2rem))] rounded-md border border-neutral-200/60 bg-[var(--cat-surface,#fff)] px-4 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.2)]"
        style={{
          left: cx,
          top: flipDown ? (hole ? hole.bottom + 12 : h / 2) : tooltipTop,
          transform: flipDown ? 'translateX(-50%)' : 'translate(-50%, -100%)',
          color: 'var(--cat-text)',
        }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--cat-muted)]">
          Paso {step + 1} / {STEPS.length}
        </p>
        <h2 id="mc-onb-title" className="mt-1.5 text-[1.15rem] font-semibold leading-tight tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--cat-muted)]">{body}</p>

        <div className="mt-5 flex gap-2">
          {step > 0 ? (
            <button type="button" className="mc-btn-secondary flex-1 py-3" onClick={() => setStep((s) => s - 1)}>
              Atrás
            </button>
          ) : (
            <button type="button" className="mc-btn-secondary flex-1 py-3 text-[var(--cat-muted)]" onClick={onDismiss}>
              Saltar
            </button>
          )}
          <button type="button" className="mc-btn-primary flex-1 py-3" onClick={primary}>
            {last ? 'Agregar productos' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAssignSellerOnboardingTabAnchors() {
  const tabAnchorsRef = useRef<(HTMLElement | null)[]>([null, null, null, null])
  const assignersRef = useRef<((el: HTMLElement | null) => void)[] | null>(null)
  if (!assignersRef.current) {
    assignersRef.current = [0, 1, 2, 3].map(
      (_, i) => (el: HTMLElement | null) => {
        tabAnchorsRef.current[i] = el
      },
    )
  }
  return { tabAnchorsRef, tabAnchorAssignRefs: assignersRef.current }
}
