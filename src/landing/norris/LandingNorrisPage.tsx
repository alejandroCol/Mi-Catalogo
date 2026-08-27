import { useEffect, useRef } from 'react'
import { applyMcPageSeo, MC_SEO } from '@/seo/mcSeo'
import { applyLandingHomeJsonLd, clearLandingHomeJsonLd } from '@/seo/landingHomeJsonLd'
import { useNorrisHeroProgress } from '@/landing/norris/useNorrisSectionProgress'
import { useNorrisStoreScroll } from '@/landing/norris/useNorrisStoreScroll'
import { useNorrisStoreSwipe } from '@/landing/norris/useNorrisStoreSwipe'
import { LandingNorrisHero } from '@/landing/norris/LandingNorrisHero'
import { LandingNorrisStoreStage } from '@/landing/norris/LandingNorrisStoreStage'
import { LandingNorrisPowerStage } from '@/landing/norris/LandingNorrisPowerStage'
import { LandingNorrisSplitSections, NorrisSplitBlock } from '@/landing/norris/LandingNorrisSplitSections'
import { LandingNorrisCloseStage } from '@/landing/norris/LandingNorrisCloseStage'
import { LandingNorrisSeoFaq } from '@/landing/norris/LandingNorrisSeoFaq'
import { LandingNorrisFooter } from '@/landing/norris/LandingNorrisFooter'
import { LandingWhatsAppButton } from '@/landing/components/LandingWhatsAppButton'
import { norrisPinnedStores, norrisSplitSections } from '@/landing/norris/norrisContent'

const creaSection = norrisSplitSections[0]

export function LandingNorrisPage() {
  const heroProgress = useNorrisHeroProgress()
  const storeSectionRef = useRef<HTMLElement>(null)
  const storeScroll = useNorrisStoreScroll(storeSectionRef, norrisPinnedStores.length)
  const storeCarousel = useNorrisStoreSwipe(storeSectionRef, storeScroll, norrisPinnedStores.length)

  useEffect(() => {
    applyMcPageSeo(MC_SEO.home)
    applyLandingHomeJsonLd()
    document.documentElement.classList.add('mc-norris-scroll')
    return () => {
      document.documentElement.classList.remove('mc-norris-scroll')
      clearLandingHomeJsonLd()
    }
  }, [])

  return (
    <div className="mc-norris mc-norris--enter">
      <LandingNorrisHero scrollProgress={heroProgress} />
      <main className="mc-norris-main">
        <LandingNorrisStoreStage
          sectionRef={storeSectionRef}
          {...storeScroll}
          slideIndex={storeCarousel.slideIndex}
          activeIndex={storeCarousel.activeIndex}
          swipeActive={storeCarousel.swipeActive}
        />
        <NorrisSplitBlock
          lineA={creaSection.lineA}
          lineB={creaSection.lineB}
          body={creaSection.body}
        />
        <LandingNorrisPowerStage />
        <LandingNorrisSplitSections skipIds={['crea']} />
        <LandingNorrisCloseStage />
        <LandingNorrisSeoFaq />
      </main>
      <LandingNorrisFooter />
      <LandingWhatsAppButton />
    </div>
  )
}
