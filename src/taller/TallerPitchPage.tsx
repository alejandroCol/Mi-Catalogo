import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { MC_BRAND } from '@/brand/mcBrand'
import { MiCatalogoLogo } from '@/brand/MiCatalogoLogo'
import { IconCheck, IconChevronLeft, IconChevronRight } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { formatCop } from '@/lib/formatCop'
import { isMcSuperAdminUser } from '@/lib/mcUserFromFirestore'
import { MC } from '@/lib/mcCollections'
import { PosIconBox } from '@/pos/components/PosIcon'
import {
  TALLER_PITCH_SLIDE_COUNT,
  tallerPitchBenefits,
  tallerPitchCommissionExample,
  tallerPitchPasarelaModes,
  tallerPitchFeatures,
  tallerPitchPlans,
  tallerPitchPosFeatures,
  tallerPitchResults,
  tallerPitchSlideLabels,
} from '@/taller/tallerPitchContent'
import type { McTaller } from '@/types/mc'

function FeatureIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    catalogo: 'M4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h6v4H9v-4z',
    pos: 'M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h12v2H4v-2zm0 4h8v2H4v-2zm12-8h2v8h-2v-8z',
    whatsapp:
      'M12 2C6.48 2 2 6.03 2 10.88c0 2.47 1.19 4.68 3.07 6.15L4 22l5.25-1.37A9.86 9.86 0 0012 19.76C17.52 19.76 22 15.73 22 10.88S17.52 2 12 2z',
    inventario: 'M9 3H5a2 2 0 00-2 2v4h6V3zm10 0h-4v6h6V5a2 2 0 00-2-2zM3 13v4a2 2 0 002 2h4v-6H3zm10 0v6h4a2 2 0 002-2v-4h-6z',
    checkout: 'M4 4h16l-1 12H5L4 4zm2 2l.8 8h10.4L18 6H6zm2 14a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z',
    envios: 'M3 6h11v9H3V6zm13 2h3l2 3v4h-5V8zm-11 11a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z',
    cupones: 'M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2H4zm0 2h16v2a2 2 0 01-2 2h-1.5a3.5 3.5 0 01-7 0H9.5a3.5 3.5 0 01-7 0H4a2 2 0 01-2-2v-2z',
  }
  const d = paths[id] ?? paths.catalogo
  return (
    <svg className="mc-landing-bento__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={d} />
    </svg>
  )
}

export function TallerPitchPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { profile } = useMcAuth()
  const [slide, setSlide] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [tallerTitle, setTallerTitle] = useState('Crea tu ecommerce')

  const goNext = useCallback(
    () => setSlide((s) => Math.min(TALLER_PITCH_SLIDE_COUNT - 1, s + 1)),
    [],
  )
  const goPrev = useCallback(() => setSlide((s) => Math.max(0, s - 1)), [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.title = 'Taller — Mi Catálogo'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (!firebaseConfigured || !slug) return
    void (async () => {
      try {
        const snap = await getDoc(doc(getDb(), MC.talleres, slug.trim().toLowerCase()))
        if (snap.exists()) {
          const data = snap.data() as McTaller
          if (data.title?.trim()) setTallerTitle(data.title.trim())
        }
      } catch {
        /* título por defecto */
      }
    })()
  }, [slug])

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

  if (!isMcSuperAdminUser(profile)) {
    return <Navigate to="/app" replace />
  }

  const isDarkSlide = slide === 0 || slide === 3

  return (
    <div
      className={clsx(
        'mc-landing mc-vendedor-pitch mc-taller-pitch',
        isDarkSlide && 'mc-taller-pitch--dark',
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mc-taller-pitch__bg" aria-hidden />

      <header className="mc-vendedor-pitch__header">
        <Link to="/superadmin/talleres" className="mc-landing-btn-secondary px-4 py-2.5 text-sm no-underline">
          <span className="inline-flex items-center gap-1.5">
            <IconChevronLeft size={16} />
            Talleres
          </span>
        </Link>
        <div className="mc-taller-pitch__header-brand" aria-label={MC_BRAND.wordmark}>
          <MiCatalogoLogo variant="icon" tone={isDarkSlide ? 'onDark' : 'onLight'} size={34} />
          <span className="mc-taller-pitch__header-brand-word">{MC_BRAND.wordmark}</span>
        </div>
        <span className="mc-taller-pitch__header-count text-sm font-semibold tabular-nums">
          {slide + 1} / {TALLER_PITCH_SLIDE_COUNT}
        </span>
      </header>

      <div className={clsx('mc-taller-pitch__stage', isDarkSlide && 'mc-taller-pitch__stage--dark')}>
        {slide === 0 ? <SlideWaiting title={tallerTitle} /> : null}
        {slide === 1 ? <SlideFeatures /> : null}
        {slide === 2 ? <SlideResults /> : null}
        {slide === 3 ? <SlideWorkshop /> : null}
        {slide === 4 ? <SlideCommissions /> : null}
        {slide === 5 ? <SlidePos /> : null}
        {slide === 6 ? <SlidePlans /> : null}
      </div>

      <nav className="mc-vendedor-pitch__nav" aria-label="Navegación del taller">
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
          {Array.from({ length: TALLER_PITCH_SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a ${tallerPitchSlideLabels[i]}`}
              aria-current={i === slide ? 'step' : undefined}
              className={`mc-vendedor-pitch__dot ${i === slide ? 'mc-vendedor-pitch__dot--active' : 'w-2'}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="mc-landing-btn-primary px-4 py-2.5 text-sm disabled:opacity-35"
          disabled={slide === TALLER_PITCH_SLIDE_COUNT - 1}
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

function SlideWaiting({ title }: { title: string }) {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter mc-taller-pitch__slide--hero">
      <div className="mc-vendedor-pitch__slide-inner mc-taller-pitch__slide-inner--hero">
        <div className="mc-taller-pitch__hero-logo">
          <MiCatalogoLogo variant="full" tone="onDark" size="lg" title={MC_BRAND.wordmark} />
        </div>
        <div className="mc-taller-pitch__pulse" aria-hidden>
          <span className="mc-taller-pitch__pulse-ring" />
          <span className="mc-taller-pitch__pulse-core" />
        </div>
        <p className="mc-taller-pitch__waiting-eyebrow">Taller en vivo · 1 hora</p>
        <h1 className="mc-taller-pitch__waiting-title">{title}</h1>
        <p className="mc-taller-pitch__waiting-sub">Iniciaremos en breve…</p>
        <p className="mc-taller-pitch__waiting-hint">
          Mientras entran, revisá que tengas fotos y precios de tus productos a mano.
        </p>
        <div className="mc-taller-pitch__waiting-chips">
          <span>Celular o laptop</span>
          <span>Correo activo</span>
          <span>WhatsApp del negocio</span>
        </div>
      </div>
    </section>
  )
}

function SlideFeatures() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner">
        <div className="mb-6 text-center sm:mb-8">
          <p className="mc-landing-eyebrow">Mi Catálogo</p>
          <h2 className="mc-landing-title mx-auto">
            Todo lo que podés hacer
            <span className="mc-landing-title__accent"> en una plataforma</span>
          </h2>
        </div>
        <div className="mc-landing-bento mc-taller-pitch__bento">
          {tallerPitchFeatures.map((feature) => (
            <article
              key={feature.id}
              className={clsx(
                'mc-landing-bento__tile mc-landing-bento__tile--medium mc-taller-pitch__bento-tile',
                `mc-landing-bento__tile--${feature.accent}`,
              )}
            >
              <FeatureIcon id={feature.id} />
              <h3 className="mc-landing-bento__title">{feature.title}</h3>
              <p className="mc-landing-bento__desc">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SlideResults() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner">
        <div className="mb-6 text-center sm:mb-8">
          <p className="mc-landing-eyebrow">Resultados reales</p>
          <h2 className="mc-landing-title mx-auto">
            Lo que obtenés
            <span className="mc-landing-title__accent"> usándonos</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {tallerPitchResults.map((item, idx) => (
            <article key={item.id} className="mc-taller-pitch__result-card">
              <span className="mc-taller-pitch__result-index">{String(idx + 1).padStart(2, '0')}</span>
              <p className="mc-taller-pitch__result-value">{item.value}</p>
              <h3 className="mc-taller-pitch__result-label">{item.label}</h3>
              <p className="mc-taller-pitch__result-detail">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function SlideWorkshop() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter mc-taller-pitch__slide--hero">
      <div className="mc-vendedor-pitch__slide-inner mc-taller-pitch__slide-inner--hero">
        <div className="mc-taller-pitch__hero-logo mc-taller-pitch__hero-logo--compact">
          <MiCatalogoLogo variant="icon" tone="onDark" size={48} title={MC_BRAND.wordmark} />
        </div>
        <p className="mc-taller-pitch__waiting-eyebrow">Manos a la obra</p>
        <h2 className="mc-taller-pitch__workshop-title">
          Creemos nuestra tienda
          <span className="mc-taller-pitch__workshop-accent"> y empecemos</span>
        </h2>
        <p className="mc-taller-pitch__workshop-sub">
          En los próximos minutos vamos a crear una tienda desde cero, subir productos y dejarla lista para
          compartir.
        </p>
        <ol className="mc-taller-pitch__workshop-steps">
          <li>
            <span>1</span> Registramos la tienda
          </li>
          <li>
            <span>2</span> Subimos productos
          </li>
          <li>
            <span>3</span> Elegimos el estilo
          </li>
          <li>
            <span>4</span> Compartimos el link
          </li>
        </ol>
      </div>
    </section>
  )
}

function SlideCommissions() {
  const ex = tallerPitchCommissionExample
  const feePct = Math.round((ex.totalFeeCop / ex.grossCop) * 1000) / 10
  const netPct = 100 - feePct

  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner mc-taller-pitch__slide-inner--scroll">
        <div className="shrink-0 text-center">
          <p className="mc-landing-eyebrow">Pasarela de pagos</p>
          <h2 className="mc-landing-title mx-auto text-[clamp(1.5rem,3.5vw,2.25rem)]">
            OnePay:
            <span className="mc-landing-title__accent"> ¿con cuenta o sin cuenta?</span>
          </h2>
          <p className="mc-landing-lead mx-auto mt-2 max-w-2xl text-sm sm:text-base">
            Pasarela empresarial usada también por Movistar. Mi Catálogo no cobra comisión por venta.
          </p>
        </div>

        <div className="mc-taller-pitch__pasarela-shared shrink-0">
          <p className="mc-taller-pitch__pasarela-shared-label">
            En ambos modos · ejemplo con venta de {formatCop(ex.grossCop)}
          </p>
          <div className="mc-taller-pitch__commission-bar mt-3" aria-hidden>
            <span className="mc-taller-pitch__commission-bar-net" style={{ width: `${netPct}%` }} />
            <span className="mc-taller-pitch__commission-bar-fee" style={{ width: `${feePct}%` }} />
          </div>
          <div className="mc-taller-pitch__pasarela-shared-flow">
            <div className="mc-taller-pitch__pasarela-shared-step">
              <span>Venta</span>
              <strong>{formatCop(ex.grossCop)}</strong>
            </div>
            <span className="mc-taller-pitch__pasarela-shared-arrow" aria-hidden>
              →
            </span>
            <div className="mc-taller-pitch__pasarela-shared-step mc-taller-pitch__pasarela-shared-step--fee">
              <span>Comisión OnePay</span>
              <strong>− {formatCop(ex.totalFeeCop)}</strong>
            </div>
            <span className="mc-taller-pitch__pasarela-shared-arrow" aria-hidden>
              →
            </span>
            <div className="mc-taller-pitch__pasarela-shared-step mc-taller-pitch__pasarela-shared-step--balance">
              <span>Saldo disponible</span>
              <strong>{formatCop(ex.netCop)}</strong>
            </div>
          </div>
          <p className="mt-2 text-center text-[12px] leading-relaxed text-mc-600 sm:text-[13px]">
            {ex.rateLabel} · La cobra OnePay, no Mi Catálogo
          </p>
        </div>

        <div className="grid shrink-0 gap-3 sm:grid-cols-2 sm:gap-4">
          {tallerPitchPasarelaModes.map((mode) => (
            <article
              key={mode.id}
              className={`mc-taller-pitch__pasarela-mode ${mode.recommended ? 'mc-taller-pitch__pasarela-mode--recommended' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`mc-taller-pitch__pasarela-mode-badge ${mode.recommended ? 'mc-taller-pitch__pasarela-mode-badge--gold' : ''}`}
                >
                  {mode.badge}
                </span>
                <span className="mc-taller-pitch__pasarela-mode-timing">{mode.timing}</span>
              </div>
              <h3 className="mc-taller-pitch__pasarela-mode-title">{mode.title}</h3>
              <p className="mc-taller-pitch__pasarela-mode-sub">{mode.subtitle}</p>

              <div className="mc-taller-pitch__pasarela-mode-rows">
                <div className="mc-taller-pitch__pasarela-mode-row">
                  <span>Saldo tras la venta</span>
                  <strong>{formatCop(ex.netCop)}</strong>
                </div>
                <div
                  className={`mc-taller-pitch__pasarela-mode-row ${mode.withdrawalFeeCop > 0 ? 'mc-taller-pitch__pasarela-mode-row--fee' : 'mc-taller-pitch__pasarela-mode-row--free'}`}
                >
                  <span>
                    {mode.withdrawalLabel}
                    <em>{mode.withdrawalRate}</em>
                  </span>
                  <strong>{mode.withdrawalFeeCop > 0 ? `− ${formatCop(mode.withdrawalFeeCop)}` : '$ 0'}</strong>
                </div>
              </div>

              <div className="mc-taller-pitch__pasarela-mode-final">
                <span>Recibís en tu banco</span>
                <strong>{formatCop(mode.netFinalCop)}</strong>
              </div>
              <p className="mc-taller-pitch__pasarela-mode-foot">{mode.timingDetail}</p>
            </article>
          ))}
        </div>

        <div className="mc-vendedor-pitch__pasarela-trust shrink-0">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-mc-600">
            Confían en OnePay
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {ex.trustClients.map((client) => (
              <span key={client} className="mc-vendedor-pitch__pasarela-trust-chip">
                {client}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SlidePos() {
  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mc-landing-eyebrow">Punto de venta</p>
            <h2 className="mc-landing-title">
              Ahora veamos nuestro
              <span className="mc-landing-title__accent"> POS</span>
            </h2>
            <p className="mc-landing-lead mt-2 max-w-xl text-sm sm:text-base">
              Vendé en tienda física con el mismo inventario de tu catálogo online.
            </p>
          </div>
          <PosIconBox name="caja" tone="gold" size="lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {tallerPitchPosFeatures.map((f) => (
            <article key={f.title} className="mc-taller-pitch__pos-card">
              <PosIconBox name={f.icon} tone={f.tone} size="md" />
              <div>
                <h3 className="text-[16px] font-semibold tracking-tight text-mc-brand-gray">{f.title}</h3>
                <p className="mt-1 text-[14px] leading-snug text-mc-600">{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="mc-taller-pitch__pos-footnote">
          Configurá sedes e inventario gratis · Activá Expert para sumar vendedores POS y cobrar en caja
        </p>
      </div>
    </section>
  )
}

function SlidePlans() {
  const { expert } = tallerPitchPlans

  return (
    <section className="mc-vendedor-pitch__slide mc-vendedor-pitch__slide-enter">
      <div className="mc-vendedor-pitch__slide-inner flex h-full min-h-0 flex-col gap-5">
        <div className="shrink-0 text-center">
          <p className="mc-landing-eyebrow">Planes</p>
          <h2 className="mc-landing-title mx-auto">
            Elegí cómo
            <span className="mc-landing-title__accent"> crecer</span>
          </h2>
        </div>

        <article className="mc-taller-pitch__plan-card mc-taller-pitch__plan-card--expert mx-auto w-full max-w-xl">
          <p className="mc-taller-pitch__plan-name">{expert.name}</p>
          <div className="mc-taller-pitch__plan-prices">
            <div className="mc-taller-pitch__plan-price-block">
              <p className="mc-taller-pitch__plan-price-label">Mensual</p>
              <p className="mc-taller-pitch__plan-price">{expert.priceMonthly}</p>
              <p className="mc-taller-pitch__plan-period">/ mes</p>
            </div>
            <div className="mc-taller-pitch__plan-price-block">
              <p className="mc-taller-pitch__plan-price-label">Anual</p>
              <p className="mc-taller-pitch__plan-price">{expert.priceAnnual}</p>
              <p className="mc-taller-pitch__plan-period">/ año</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {expert.highlights.map((h) => (
              <li key={h} className="mc-taller-pitch__plan-feature">
                <IconCheck size={16} className="shrink-0 text-mc-brand-gold" />
                {h}
              </li>
            ))}
          </ul>
        </article>

        <div className="mc-taller-pitch__benefits-bar">
          {tallerPitchBenefits.map((b) => (
            <span key={b} className="mc-taller-pitch__benefit-chip">
              <IconCheck size={14} className="text-mc-brand-gold" />
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
