import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { landingHomeFaqItems } from '@/seo/landingHomeSeoContent'
import { LANDING_FAQ_PATH } from '@/landing/faqContent'

export function LandingNorrisSeoFaq() {
  const [openId, setOpenId] = useState<string | null>(landingHomeFaqItems[0]?.id ?? null)

  return (
    <section className="mc-norris-seo-faq" aria-labelledby="mc-norris-seo-faq-title">
      <div className="mc-norris-seo-faq__inner">
        <header className="mc-norris-seo-faq__head">
          <p className="mc-norris-kicker mc-norris-kicker--store">Crear tienda virtual</p>
          <h2 id="mc-norris-seo-faq-title" className="mc-norris-seo-faq__title">
            Preguntas frecuentes
          </h2>
          <p className="mc-norris-seo-faq__lead">
            Respuestas claras para quien busca crear una tienda online en Colombia.
          </p>
        </header>

        <div className="mc-norris-faq__list mc-norris-seo-faq__list">
          {landingHomeFaqItems.map((item, i) => {
            const open = openId === item.id
            const num = String(i + 1).padStart(2, '0')
            return (
              <article key={item.id} className={clsx('mc-norris-faq__item', open && 'mc-norris-faq__item--open')}>
                <h3 className="mc-norris-faq__question">
                  <button
                    type="button"
                    className="mc-norris-faq__trigger"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    <span className="mc-norris-faq__index" aria-hidden>
                      {num}
                    </span>
                    <span className="mc-norris-faq__question-text">{item.question}</span>
                    <span className={clsx('mc-norris-faq__toggle', open && 'mc-norris-faq__toggle--open')} aria-hidden />
                  </button>
                </h3>
                <div className={clsx('mc-norris-faq__answer', !open && 'mc-norris-faq__answer--collapsed')}>
                  <p>{item.answer}</p>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mc-norris-seo-faq__more">
          <Link to={LANDING_FAQ_PATH}>Ver todas las preguntas</Link>
          {' · '}
          <Link to="/registro">Crear mi tienda virtual</Link>
        </p>
      </div>
    </section>
  )
}
