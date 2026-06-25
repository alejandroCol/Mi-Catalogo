import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { buildStorePublicUrl } from '@/lib/storePublicUrl'
import { PosIcon } from '@/pos/components/PosIcon'
import {
  POS_DEMO_TOUR_STEPS,
  POS_DEMO_TOUR_STORAGE,
  type PosDemoTourStep,
} from '@/pos/lib/posDemoTourSteps'

type Props = {
  catalogSlug?: string | null
  onClose: () => void
}

export function PosDemoTour({ catalogSlug, onClose }: Props) {
  const nav = useNavigate()
  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const raw = sessionStorage.getItem(POS_DEMO_TOUR_STORAGE)
      return raw ? Math.min(Number(raw) || 0, POS_DEMO_TOUR_STEPS.length - 1) : 0
    } catch {
      return 0
    }
  })

  const step = POS_DEMO_TOUR_STEPS[stepIndex]!
  const progress = ((stepIndex + 1) / POS_DEMO_TOUR_STEPS.length) * 100
  const isLast = stepIndex >= POS_DEMO_TOUR_STEPS.length - 1

  useEffect(() => {
    try {
      sessionStorage.setItem(POS_DEMO_TOUR_STORAGE, String(stepIndex))
    } catch {
      /* ignore */
    }
  }, [stepIndex])

  const goToStep = useCallback(
    (s: PosDemoTourStep) => {
      if (s.path) nav(s.path)
      if (s.openCatalog && catalogSlug) {
        window.open(buildStorePublicUrl(catalogSlug), '_blank', 'noopener,noreferrer')
      }
    },
    [nav, catalogSlug],
  )

  function siguiente() {
    if (isLast) {
      try {
        sessionStorage.removeItem(POS_DEMO_TOUR_STORAGE)
      } catch {
        /* ignore */
      }
      onClose()
      return
    }
    const next = stepIndex + 1
    setStepIndex(next)
    goToStep(POS_DEMO_TOUR_STEPS[next]!)
  }

  function irAhora() {
    goToStep(step)
  }

  return (
    <div className="mc-pos-demo-tour" role="dialog" aria-label="Demo guiada POS">
      <div className="mc-pos-demo-tour__bar">
        <div className="mc-pos-demo-tour__progress" style={{ width: `${progress}%` }} />
      </div>
      <div className="mc-pos-demo-tour__head">
        <div>
          <p className="mc-pos-demo-tour__eyebrow">Demo 90 seg · Paso {stepIndex + 1}/{POS_DEMO_TOUR_STEPS.length}</p>
          <h2 className="mc-pos-demo-tour__title">{step.title}</h2>
        </div>
        <button type="button" className="mc-pos-demo-tour__close" onClick={onClose} aria-label="Cerrar demo">
          ×
        </button>
      </div>
      <p className="mc-pos-demo-tour__desc">{step.description}</p>
      {step.openCatalog && catalogSlug && (
        <p className="mc-pos-demo-tour__tip">
          <PosIcon name="sync" size={14} />
          Tip presentación: POS a la izquierda, catálogo <strong>{catalogSlug}</strong> a la derecha.
        </p>
      )}
      <div className="mc-pos-demo-tour__actions">
        {step.path && (
          <Link to={step.path} className="mc-landing-btn-ghost text-sm no-underline" onClick={irAhora}>
            Ir al paso
          </Link>
        )}
        {step.openCatalog && catalogSlug && (
          <button
            type="button"
            className="mc-landing-btn-secondary text-sm"
            onClick={() => window.open(buildStorePublicUrl(catalogSlug), '_blank', 'noopener,noreferrer')}
          >
            Abrir catálogo
          </button>
        )}
        <button type="button" className="mc-landing-btn-primary text-sm" onClick={siguiente}>
          {isLast ? 'Finalizar demo' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
