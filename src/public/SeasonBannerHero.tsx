import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { isSeasonBannerActive, resolveSeasonBanner, scrollToCatalogProducts } from '@/lib/seasonBanner'
import type { McTenant } from '@/types/mc'

type Props = {
  tenant: McTenant
  /** Vista previa en panel admin (altura acotada). */
  preview?: boolean
  className?: string
}

export function SeasonBannerHero({ tenant, preview = false, className }: Props) {
  const content = resolveSeasonBanner(tenant)
  const active = preview || isSeasonBannerActive(tenant)
  const [entered, setEntered] = useState(preview)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!active || !content) return
    if (preview) {
      setEntered(true)
      return
    }
    const t = window.setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [active, content, preview])

  useEffect(() => {
    if (!content || content.mediaType !== 'video' || !content.videoUrl) return
    const video = videoRef.current
    if (!video) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return

    if (preview) {
      void video.play().catch(() => undefined)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void video.play().catch(() => undefined)
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [content, preview])

  if (!active || !content) return null

  const storeName = tenant.nombreTienda?.trim()
  const isVideo = content.mediaType === 'video' && Boolean(content.videoUrl)

  return (
    <section
      className={clsx(
        'mc-season-hero',
        entered && 'mc-season-hero--in',
        preview && 'mc-season-hero--preview',
        isVideo && 'mc-season-hero--video',
        className,
      )}
      aria-label={content.headline}
    >
      <div className="mc-season-hero__media" aria-hidden>
        {isVideo ? (
          <video
            ref={videoRef}
            src={content.videoUrl}
            poster={content.posterUrl}
            className="mc-season-hero__video"
            autoPlay={preview}
            muted
            loop
            playsInline
            preload={preview ? 'auto' : 'metadata'}
          />
        ) : content.imageUrl ? (
          <img src={content.imageUrl} alt="" className="mc-season-hero__img" decoding="async" />
        ) : (
          <div className="mc-season-hero__img-placeholder" />
        )}
        <div className="mc-season-hero__scrim" />
        <div className="mc-season-hero__grain" aria-hidden />
      </div>

      <div className="mc-season-hero__inner">
        <div className="mc-season-hero__content">
          <p className="mc-season-hero__eyebrow">{content.eyebrow}</p>
          <h1 className="mc-season-hero__headline">{content.headline}</h1>
          <p className="mc-season-hero__sub">{content.subheadline}</p>
          {storeName && content.headline !== storeName ? (
            <p className="mc-season-hero__store">{storeName}</p>
          ) : null}
          <button
            type="button"
            className="mc-season-hero__cta"
            onClick={() => scrollToCatalogProducts()}
          >
            {content.ctaLabel}
          </button>
        </div>
      </div>

      {!preview ? (
        <button
          type="button"
          className="mc-season-hero__scroll-hint"
          aria-label="Ir a los productos"
          onClick={() => scrollToCatalogProducts()}
        >
          <span className="mc-season-hero__scroll-line" aria-hidden />
        </button>
      ) : null}
    </section>
  )
}
