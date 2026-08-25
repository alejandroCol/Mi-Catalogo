import { useState } from 'react'
import clsx from 'clsx'
import { storeExamples, storeScreenshots } from '@/landing/landingContent'
import { LandingSection } from '@/landing/components/LandingSection'
import { LandingRegisterButton } from '@/landing/components/LandingRegisterButton'
import { LandingReveal } from '@/landing/components/LandingReveal'
import { StorePreviewFrame } from '@/landing/components/StorePreviewFrame'

export function LandingStoreShowcase() {
  const [activeId, setActiveId] = useState(storeExamples[0].id)
  const active = storeExamples.find((s) => s.id === activeId) ?? storeExamples[0]
  const activeScreenshot =
    storeScreenshots.find((s) => s.storeName === active.storeName) ?? storeScreenshots[0]

  return (
    <LandingSection id="tiendas" className="mc-landing-showcase-section">
      <LandingReveal className="mc-landing-showcase__head">
        <p className="mc-landing-eyebrow">Tu tienda, tu estilo</p>
        <h2 className="mc-landing-title">
          Así se ven las tiendas
          <span className="mc-landing-title__accent"> que creás con nosotros</span>
        </h2>
        <p className="mc-landing-lead">
          Estilos editoriales pensados para moda, hogar, joyería y más. Cada plantilla está
          diseñada para que tus productos brillen — en desktop y mobile.
        </p>
      </LandingReveal>

      <LandingReveal delay={80}>
        <div className="mc-landing-showcase__tabs" role="tablist" aria-label="Ejemplos de tiendas">
          {storeExamples.map((store) => (
            <button
              key={store.id}
              type="button"
              role="tab"
              aria-selected={activeId === store.id}
              className={clsx(
                'mc-landing-showcase__tab',
                activeId === store.id && 'mc-landing-showcase__tab--active',
              )}
              onClick={() => setActiveId(store.id)}
            >
              <span className="mc-landing-showcase__tab-name">{store.storeName}</span>
              <span className="mc-landing-showcase__tab-cat">{store.category}</span>
            </button>
          ))}
        </div>
      </LandingReveal>

      <LandingReveal delay={140} variant="scale">
        <div className="mc-landing-showcase__panel" role="tabpanel" key={active.id}>
          <div className="mc-landing-showcase__visual-col">
            <div className="mc-landing-showcase__screenshot-wrap">
              <img
                src={activeScreenshot.imageUrl}
                alt={activeScreenshot.imageAlt}
                className="mc-landing-showcase__screenshot"
                loading="lazy"
                decoding="async"
              />
              <div className="mc-landing-showcase__screenshot-glow" aria-hidden />
            </div>
            <div className="mc-landing-showcase__preview">
              <StorePreviewFrame store={active} />
            </div>
          </div>

          <div className="mc-landing-showcase__info">
            <h3 className="mc-landing-showcase__store-title">{active.storeName}</h3>
            <p className="mc-landing-showcase__tagline">{active.tagline}</p>
            <ul className="mc-landing-showcase__products">
              {active.products.map((p) => (
                <li key={p.name} className="mc-landing-showcase__product-row">
                  <span>{p.name}</span>
                  <span className="mc-landing-showcase__product-price">{p.price}</span>
                </li>
              ))}
            </ul>
            <p className="mc-landing-showcase__hint">
              Tu link queda en{' '}
              <code className="mc-landing-code">{active.id}.micatalogo.io</code>
            </p>
            <LandingRegisterButton className="mt-6" />
          </div>
        </div>
      </LandingReveal>
    </LandingSection>
  )
}
