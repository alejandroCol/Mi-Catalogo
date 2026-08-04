import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { IconChevronRight, IconWhatsApp } from '@/icons/McIcons'
import { LANDING_FAQ_PATH } from '@/landing/faqContent'
import { mcSupportWhatsappUrl } from '@/lib/mcSupportContact'

type Props = {
  /** Si es false, el FAB abre WhatsApp directo (útil en la página de FAQ). */
  offerFaqFirst?: boolean
}

export function LandingWhatsAppButton({ offerFaqFirst = true }: Props) {
  const location = useLocation()
  const onFaqPage = location.pathname === LANDING_FAQ_PATH
  const showChooser = offerFaqFirst && !onFaqPage

  const [open, setOpen] = useState(false)
  const titleId = useId()
  const descId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const waHref = mcSupportWhatsappUrl()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleFabClick = () => {
    if (showChooser) {
      setOpen(true)
      return
    }
    window.open(waHref, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <button
        type="button"
        className={clsx('mc-landing-wa-fab', open && 'mc-landing-wa-fab--open')}
        aria-haspopup={showChooser ? 'dialog' : undefined}
        aria-expanded={showChooser ? open : undefined}
        aria-label={showChooser ? 'Abrir opciones de contacto' : 'Escribir por WhatsApp'}
        onClick={handleFabClick}
      >
        <IconWhatsApp monochrome size={28} className="mc-landing-wa-fab__icon" />
        <span className="mc-landing-wa-fab__pulse" aria-hidden />
      </button>

      {open ? (
        <div className="mc-landing-wa-sheet" role="presentation">
          <button
            type="button"
            className="mc-landing-wa-sheet__backdrop"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <div
            className="mc-landing-wa-sheet__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
          >
            <div className="mc-landing-wa-sheet__handle" aria-hidden />
            <div className="mc-landing-wa-sheet__head">
              <p className="mc-landing-eyebrow mb-2">Estamos para ayudarte</p>
              <h2 id={titleId} className="mc-landing-wa-sheet__title">
                ¿Cómo preferís continuar?
              </h2>
              <p id={descId} className="mc-landing-wa-sheet__lead">
                Resolvé dudas al instante o escribinos y te acompañamos a crear tu tienda.
              </p>
            </div>

            <div className="mc-landing-wa-sheet__options">
              <Link
                to={LANDING_FAQ_PATH}
                className="mc-landing-wa-option"
                onClick={() => setOpen(false)}
              >
                <span className="mc-landing-wa-option__icon mc-landing-wa-option__icon--faq" aria-hidden>
                  ?
                </span>
                <span className="mc-landing-wa-option__copy">
                  <span className="mc-landing-wa-option__label">Ir a preguntas frecuentes</span>
                  <span className="mc-landing-wa-option__hint">
                    Planes, pasarela, personalización y más — en 2 minutos
                  </span>
                </span>
                <IconChevronRight size={18} className="mc-landing-wa-option__chevron" />
              </Link>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-landing-wa-option mc-landing-wa-option--whatsapp"
                onClick={() => setOpen(false)}
              >
                <span className="mc-landing-wa-option__icon mc-landing-wa-option__icon--wa" aria-hidden>
                  <IconWhatsApp monochrome size={20} />
                </span>
                <span className="mc-landing-wa-option__copy">
                  <span className="mc-landing-wa-option__label">Escribir a WhatsApp</span>
                  <span className="mc-landing-wa-option__hint">
                    Te respondemos y te ayudamos a lanzar tu tienda
                  </span>
                </span>
                <IconChevronRight size={18} className="mc-landing-wa-option__chevron" />
              </a>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              className="mc-landing-wa-sheet__close"
              onClick={() => setOpen(false)}
            >
              Ahora no
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
