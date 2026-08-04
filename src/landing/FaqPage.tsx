import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { IconChevronRight } from '@/icons/McIcons'
import { LandingBrandLogo } from '@/landing/components/LandingBrandLogo'
import { LandingFooter } from '@/landing/components/LandingFooter'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { LandingWhatsAppButton } from '@/landing/components/LandingWhatsAppButton'
import { faqPageContent, landingFaqItems, type LandingFaqItem } from '@/landing/faqContent'
import { mcSupportWhatsappUrl } from '@/lib/mcSupportContact'

function FaqAccordionItem({
  item,
  open,
  onToggle,
}: {
  item: LandingFaqItem
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className={clsx('mc-landing-faq__item', open && 'mc-landing-faq__item--open')}>
      <button
        type="button"
        className="mc-landing-faq__trigger"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="mc-landing-faq__question">{item.question}</span>
        <span className={clsx('mc-landing-faq__chevron', open && 'mc-landing-faq__chevron--open')} aria-hidden>
          <IconChevronRight size={18} />
        </span>
      </button>
      {open ? (
        <div className="mc-landing-faq__answer">
          <p>{item.answer}</p>
        </div>
      ) : null}
    </div>
  )
}

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>(landingFaqItems[0]?.id ?? null)
  const waHref = mcSupportWhatsappUrl()

  useEffect(() => {
    document.title = 'Preguntas frecuentes — Mi Catálogo'
    const meta = document.querySelector('meta[name="description"]')
    if (meta) {
      meta.setAttribute(
        'content',
        'Respuestas sobre planes, productos, personalización, pasarela de pagos y más. Creá tu tienda en Mi Catálogo.',
      )
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="mc-landing mc-landing--faq">
      <header className="mc-landing-nav mc-landing-nav--scrolled">
        <div className="mc-landing-container mc-landing-nav__inner">
          <Link to="/" className="mc-landing-nav__brand" aria-label="mi catálogo — inicio">
            <LandingBrandLogo />
          </Link>
          <div className="mc-landing-nav__actions mc-landing-nav__actions--faq">
            <Link to="/" className="mc-landing-nav__login">
              Inicio
            </Link>
            <LandingRegisterButton variant="nav" />
          </div>
        </div>
      </header>

      <main>
        <section className="mc-landing-faq-hero">
          <div className="mc-landing-container">
            <p className="mc-landing-eyebrow">{faqPageContent.eyebrow}</p>
            <h1 className="mc-landing-title">
              {faqPageContent.title}{' '}
              <span className="mc-landing-title__accent">{faqPageContent.titleAccent}</span>
            </h1>
            <p className="mc-landing-lead">{faqPageContent.lead}</p>
          </div>
        </section>

        <section className="mc-landing-faq-list-section" aria-label="Preguntas frecuentes">
          <div className="mc-landing-container">
            <div className="mc-landing-faq__list">
              {landingFaqItems.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mc-landing-faq-cta">
          <div className="mc-landing-container mc-landing-faq-cta__inner">
            <div>
              <h2 className="mc-landing-faq-cta__title">{faqPageContent.ctaTitle}</h2>
              <p className="mc-landing-faq-cta__lead">{faqPageContent.ctaLead}</p>
            </div>
            <div className="mc-landing-faq-cta__actions">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-landing-btn-secondary mc-landing-faq-cta__wa"
              >
                {faqPageContent.ctaWhatsApp}
              </a>
              <LandingRegisterButton variant="primary" />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
      <LandingWhatsAppButton offerFaqFirst={false} />
    </div>
  )
}
