import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconCheck, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import {
  pitchClosingLines,
  pitchHero,
  pitchValueProps,
  shopifyComparison,
} from '@/vendedor/vendedorPitchContent'

const SLIDE_COUNT = 5

const KEY_MESSAGES = [
  'No pagás dominio aparte: tu tienda ya tiene dirección profesional.',
  'No pagás hosting ni servidores: todo está en la nube, incluido.',
  'No necesitás contratar un vendedor: la tienda atiende, cobra y confirma pedidos.',
  'Un solo precio claro: $29.900 al mes. Sin apps sorpresa ni temas premium.',
]

const PRICE_INCLUDES = ['Dominio incluido', 'Hosting en la nube', 'Checkout Colombia', 'Soporte y actualizaciones']

export function VendedorPitchPage() {
  const [slide, setSlide] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const goNext = useCallback(() => setSlide((s) => Math.min(SLIDE_COUNT - 1, s + 1)), [])
  const goPrev = useCallback(() => setSlide((s) => Math.max(0, s - 1)), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goNext()
      }
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0]?.clientX ?? null)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX == null) return
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX
    if (delta < -48) goNext()
    if (delta > 48) goPrev()
    setTouchStartX(null)
  }

  return (
    <div className="mc-vendedor-pitch" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="mc-vendedor-pitch__header">
        <Link to="/vendedor" className="mc-landing-btn-secondary px-4 py-2.5 text-sm no-underline">
          <span className="inline-flex items-center gap-1.5">
            <IconChevronLeft size={16} />
            Panel
          </span>
        </Link>
        <p className="mc-landing-eyebrow mb-0 hidden sm:block">Pitch comercial</p>
        <span className="text-sm font-semibold tabular-nums text-mc-brand-gray">
          {slide + 1} / {SLIDE_COUNT}
        </span>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {slide === 0 ? <SlideHero /> : null}
        {slide === 1 ? <SlidePrice /> : null}
        {slide === 2 ? <SlideValueProps /> : null}
        {slide === 3 ? <SlideComparison /> : null}
        {slide === 4 ? <SlideClosing /> : null}
      </div>

      <nav className="mc-vendedor-pitch__nav" aria-label="Navegación del pitch">
        <button
          type="button"
          className="mc-landing-btn-secondary px-4 py-2.5 text-sm disabled:opacity-35"
          disabled={slide === 0}
          onClick={goPrev}
        >
          <span className="inline-flex items-center gap-1">
            <IconChevronLeft size={16} />
            Anterior
          </span>
        </button>

        <div className="mc-vendedor-pitch__dots">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              aria-current={i === slide ? 'step' : undefined}
              className={`mc-vendedor-pitch__dot ${i === slide ? 'mc-vendedor-pitch__dot--active' : 'w-2'}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="mc-landing-btn-primary px-4 py-2.5 text-sm disabled:opacity-35"
          disabled={slide === SLIDE_COUNT - 1}
          onClick={goNext}
        >
          <span className="inline-flex items-center gap-1">
            Siguiente
            <IconChevronRight size={16} />
          </span>
        </button>
      </nav>
    </div>
  )
}

function SlideHero() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="mc-landing-eyebrow">{pitchHero.eyebrow}</p>
          <h1 className="mc-landing-hero__title">
            {pitchHero.headline}
            <span className="mc-landing-hero__accent">{pitchHero.headlineAccent}</span>
          </h1>
          <p className="mc-landing-hero__sub max-w-2xl">{pitchHero.subheadline}</p>
        </div>
        <div className="mc-vendedor-pitch__price-card">
          <p className="mc-landing-eyebrow mb-3">Plan todo incluido</p>
          <p className="mc-vendedor-pitch__price-value">{pitchHero.priceLabel}</p>
          <p className="mt-3 text-base font-medium text-mc-600">{pitchHero.priceNote}</p>
        </div>
      </div>
    </section>
  )
}

function SlidePrice() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner text-center">
        <p className="mc-landing-eyebrow">Inversión clara</p>
        <h2 className="mc-landing-title mx-auto">Un precio. Sin sorpresas.</h2>
        <div className="mx-auto mt-8 max-w-lg mc-vendedor-pitch__price-card">
          <p className="mc-vendedor-pitch__price-value">{pitchHero.priceLabel}</p>
          <p className="mt-4 text-lg font-medium text-mc-600">{pitchHero.priceNote}</p>
        </div>
        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-2">
          {PRICE_INCLUDES.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-neutral-200/50 bg-white px-4 py-3.5 text-[15px] font-medium text-mc-brand-gray"
            >
              <IconCheck size={18} className="shrink-0 text-mc-brand-gold" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SlideValueProps() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner">
        <div className="mb-8 text-center">
          <p className="mc-landing-eyebrow">Por qué Mi Catálogo</p>
          <h2 className="mc-landing-title mx-auto">
            Cuatro razones para decir
            <span className="mc-landing-title__accent"> sí hoy</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pitchValueProps.map((v, idx) => (
            <article key={v.id} className="mc-landing-steps__item">
              <span className="mc-landing-steps__number">{idx + 1}</span>
              <h3 className="mc-landing-steps__title">{v.title}</h3>
              <p className="mc-landing-steps__desc">{v.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SlideComparison() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner flex h-full flex-col">
        <div className="shrink-0 text-center">
          <p className="mc-landing-eyebrow">Comparativo</p>
          <h2 className="mc-landing-title mx-auto">
            Mi Catálogo vs
            <span className="mc-landing-title__accent"> Shopify</span>
          </h2>
          <p className="mc-landing-lead mx-auto mt-2 max-w-xl text-sm sm:text-base">
            Referencia de mercado en Colombia para visita presencial.
          </p>
        </div>
        <div className="mc-vendedor-pitch__compare mt-6 min-h-0 flex-1 overflow-auto">
          <div className="mc-vendedor-pitch__compare-head">
            <div className="p-3 md:p-4">Concepto</div>
            <div className="border-l border-neutral-200/50 p-3 text-mc-brand-gray md:p-4">Mi Catálogo</div>
            <div className="border-l border-neutral-200/50 p-3 md:p-4">Shopify</div>
          </div>
          {shopifyComparison.map((row) => (
            <div
              key={row.feature}
              className={`mc-vendedor-pitch__compare-row ${row.highlight ? 'mc-vendedor-pitch__compare-row--highlight' : ''}`}
            >
              <div className="p-3 text-sm font-medium text-mc-brand-gray md:p-4">{row.feature}</div>
              <div className="flex items-start gap-2 border-l border-neutral-100 p-3 md:p-4">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-mc-brand-gold" />
                <span className="text-sm leading-snug text-mc-800">{row.micatalogo}</span>
              </div>
              <div className="border-l border-neutral-100 p-3 text-sm leading-snug text-mc-500 md:p-4">
                {row.shopify}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SlideClosing() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="mc-vendedor-panel">
          <h2 className="mc-landing-title text-[clamp(1.5rem,3vw,2rem)]">Mensajes clave para cerrar</h2>
          <ul className="mt-6 space-y-4">
            {KEY_MESSAGES.map((msg) => (
              <li key={msg} className="flex gap-3 text-[15px] leading-relaxed text-mc-600 md:text-base">
                <span className="font-bold text-mc-brand-gold">→</span>
                {msg}
              </li>
            ))}
          </ul>
        </div>
        <div className="mc-vendedor-panel--dark mc-vendedor-panel flex flex-col justify-center">
          <div className="relative z-10">
            {pitchClosingLines.map((line) => (
              <p key={line} className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold leading-snug tracking-tight">
                {line}
              </p>
            ))}
            <p className="mt-6 border-t border-white/15 pt-6 text-sm leading-relaxed opacity-80">
              Mostrá la demo del rubro y cerrá con el link de prueba.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
