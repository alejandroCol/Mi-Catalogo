import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { LandingNorrisBrandLogo } from '@/landing/norris/LandingNorrisBrandLogo'
import { LandingNorrisHeroBackground } from '@/landing/norris/LandingNorrisHeroBackground'
import { LandingNorrisFooter } from '@/landing/norris/LandingNorrisFooter'
import { LandingWhatsAppButton } from '@/landing/components/LandingWhatsAppButton'
import { faqPageContent, landingFaqItems, type LandingFaqItem } from '@/landing/faqContent'
import { mcSupportWhatsappUrl } from '@/lib/mcSupportContact'
import { applyMcPageSeo, MC_SEO, removeJsonLd, upsertJsonLd } from '@/seo/mcSeo'

function FaqAccordionItem({
  item,
  index,
  open,
  onToggle,
}: {
  item: LandingFaqItem
  index: number
  open: boolean
  onToggle: () => void
}) {
  const num = String(index + 1).padStart(2, '0')

  return (
    <article className={clsx('mc-norris-faq__item', open && 'mc-norris-faq__item--open')}>
      <h2 className="mc-norris-faq__question">
        <button type="button" className="mc-norris-faq__trigger" aria-expanded={open} onClick={onToggle}>
          <span className="mc-norris-faq__index" aria-hidden>
            {num}
          </span>
          <span className="mc-norris-faq__question-text">{item.question}</span>
          <span className={clsx('mc-norris-faq__toggle', open && 'mc-norris-faq__toggle--open')} aria-hidden />
        </button>
      </h2>
      <div className={clsx('mc-norris-faq__answer', !open && 'mc-norris-faq__answer--collapsed')}>
        <p>{item.answer}</p>
      </div>
    </article>
  )
}

export function FaqPage() {
  const [openId, setOpenId] = useState<string | null>(landingFaqItems[0]?.id ?? null)
  const waHref = mcSupportWhatsappUrl()

  useEffect(() => {
    applyMcPageSeo(MC_SEO.faq)
    upsertJsonLd('mc-faq-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: landingFaqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
    document.documentElement.classList.add('mc-norris-scroll')
    window.scrollTo(0, 0)
    return () => {
      document.documentElement.classList.remove('mc-norris-scroll')
      removeJsonLd('mc-faq-jsonld')
    }
  }, [])

  return (
    <div className="mc-norris mc-norris-faq">
      <header className="mc-norris-faq__nav">
        <LandingNorrisBrandLogo />
        <div className="mc-norris-faq__nav-actions">
          <Link to="/" className="mc-norris-hero__login">
            Inicio
          </Link>
          <Link to="/registro" className="mc-norris-faq__nav-cta">
            Crear tienda
          </Link>
        </div>
      </header>

      <main className="mc-norris-faq__main">
        <section className="mc-norris-faq__hero">
          <LandingNorrisHeroBackground />
          <div className="mc-norris-faq__hero-inner">
            <p className="mc-norris-kicker mc-norris-kicker--store">{faqPageContent.eyebrow}</p>
            <h1 className="mc-norris-faq__title">
              {faqPageContent.title}{' '}
              <span className="mc-norris-faq__title-accent">{faqPageContent.titleAccent}</span>
            </h1>
            <p className="mc-norris-faq__lead">{faqPageContent.lead}</p>
          </div>
        </section>

        <section className="mc-norris-faq__list-section" aria-label="Preguntas frecuentes">
          <div className="mc-norris-faq__list-wrap">
            <div className="mc-norris-faq__list">
              {landingFaqItems.map((item, i) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  index={i}
                  open={openId === item.id}
                  onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="mc-norris-faq__cta">
          <div className="mc-norris-faq__cta-clouds" aria-hidden>
            <LandingNorrisHeroBackground />
          </div>
          <div className="mc-norris-faq__cta-inner">
            <div className="mc-norris-faq__cta-copy">
              <p className="mc-norris-kicker mc-norris-kicker--store">¿Listo para empezar?</p>
              <h2 className="mc-norris-faq__cta-title">{faqPageContent.ctaTitle}</h2>
              <p className="mc-norris-faq__cta-lead">{faqPageContent.ctaLead}</p>
            </div>
            <div className="mc-norris-faq__cta-actions">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-norris-hero__login mc-norris-faq__cta-wa"
              >
                {faqPageContent.ctaWhatsApp}
              </a>
              <Link to="/registro" className="mc-norris-faq__cta-primary">
                {faqPageContent.ctaRegister}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingNorrisFooter />
      <LandingWhatsAppButton offerFaqFirst={false} />
    </div>
  )
}
