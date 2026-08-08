import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import { isMcPosVendorUser, isMcStoreOwnerUser } from '@/lib/mcUserFromFirestore'
import { PosBrandLogo } from '@/pos/components/PosBrandLogo'
import { PosIcon, PosIconBox } from '@/pos/components/PosIcon'
import { PosLandingMockAnimated } from '@/pos/components/PosLandingMockAnimated'
import { POS_LANDING_FEATURES } from '@/pos/lib/posNavConfig'
import { applyMcPageSeo, MC_SEO } from '@/seo/mcSeo'

export function PosLandingPage() {
  const { firebaseUser, profile, profileReady, loading } = useMcAuth()

  useEffect(() => {
    applyMcPageSeo(MC_SEO.pos)
  }, [])

  if (!loading && profileReady && firebaseUser && profile) {
    if (isMcPosVendorUser(profile)) return <Navigate to="/pos/ventas" replace />
    if (isMcStoreOwnerUser(profile)) return <Navigate to="/pos/admin" replace />
  }

  return (
    <div className="mc-landing mc-pos-landing">
      <header className="mc-pos-landing__nav">
        <div className="mc-landing-container flex items-center justify-between py-5">
          <PosBrandLogo to="/" />
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/login" className="mc-landing-btn-ghost text-sm no-underline">
              Ingresar
            </Link>
            <Link to="/registro" className="mc-landing-btn-primary text-sm no-underline">
              Crear tienda
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mc-pos-landing__hero">
          <div className="mc-pos-landing__hero-bg" aria-hidden />
          <div className="mc-pos-landing__hero-glow" aria-hidden />
          <div className="mc-landing-container mc-pos-landing__hero-grid">
            <div className="mc-pos-landing__copy">
              <p className="mc-landing-eyebrow">Punto de venta</p>
              <h1 className="mc-landing-hero__title mt-4">
                Tu caja,
                <span className="mc-landing-hero__accent"> hermosa y conectada</span>
              </h1>
              <p className="mc-landing-hero__sub mt-5">
                Cobrá en tienda, controlá caja e inventario por sede, y publicá productos en tu
                catálogo online con un solo clic.
              </p>
              <div className="mc-landing-hero__ctas">
                <Link to="/login" className="mc-landing-btn-primary no-underline">
                  <PosIcon name="ventas" size={18} />
                  Entrar al POS
                </Link>
                <Link to="/app" className="mc-landing-btn-secondary no-underline">
                  Ir a mi tienda
                </Link>
              </div>
              <p className="mc-landing-hero__trust">
                <span className="mc-landing-hero__trust-dot" aria-hidden />
                Mismo inventario online y en tienda física
              </p>
            </div>

            <PosLandingMockAnimated />
          </div>
        </section>

        <section className="mc-pos-landing__features">
          <div className="mc-landing-container">
            <div className="mc-pos-landing__features-head">
              <p className="mc-landing-eyebrow">Todo incluido</p>
              <h2 className="mc-landing-title">
                Diseñado para
                <span className="mc-landing-title__accent"> vender en tienda</span>
              </h2>
            </div>
            <div className="mc-pos-landing__features-grid">
              {POS_LANDING_FEATURES.map((f) => (
                <article
                  key={f.title}
                  className={`mc-pos-feature-card mc-pos-feature-card--${f.accent}`}
                >
                  <PosIconBox name={f.icon} tone={f.accent === 'dark' ? 'dark' : 'gold'} size="md" />
                  <h3 className="mc-pos-feature-card__title">{f.title}</h3>
                  <p className="mc-pos-feature-card__desc">{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
