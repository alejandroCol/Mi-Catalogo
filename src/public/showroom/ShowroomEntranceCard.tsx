import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { catalogFontStack } from '@/lib/catalogFonts'
import {
  isCollectionShowroomPubliclyActive,
  isShowroomDropLocked,
  resolveCollectionShowroom,
  resolveShowroomCopy,
  resolveShowroomMediaType,
} from '@/lib/collectionShowroom'
import { usePublicStore } from '@/public/PublicStoreContext'
import type { McCollectionShowroom, McTenant } from '@/types/mc'

type EntranceViewProps = {
  showroom: McCollectionShowroom
  locked?: boolean
  /** Solo preview en admin (no navega). */
  preview?: boolean
  className?: string
  to?: string
}

/** Banner del showroom (home + preview admin). Estilos de forma + texto. */
export function ShowroomEntranceView({
  showroom,
  locked: lockedProp,
  preview = false,
  className = '',
  to,
}: EntranceViewProps) {
  const copy = resolveShowroomCopy(showroom)
  const locked = lockedProp ?? isShowroomDropLocked(showroom)
  const mediaType = resolveShowroomMediaType(showroom)
  const image =
    mediaType === 'video'
      ? showroom.teaserPosterUrl || showroom.teaserImageUrl
      : showroom.teaserImageUrl
  const video = mediaType === 'video' ? showroom.teaserVideoUrl : undefined

  const eyebrow = locked ? copy.teaserEyebrow : copy.homeEyebrow
  const title = locked ? copy.teaserHeadline : copy.homeHeadline
  const sub = locked ? copy.teaserSubheadline : copy.homeSubheadline
  const cta = locked ? 'Ver cuenta regresiva' : copy.homeCtaLabel
  const layout = copy.homeLayout
  const fullWidth = copy.homeFullWidth
  const fontStack = catalogFontStack(copy.homeFontId)

  const body = (
    <>
      <div className="mc-showroom-entrance__media" aria-hidden>
        {video ? (
          <video src={video} poster={image} muted loop playsInline autoPlay={preview} />
        ) : image ? (
          <img src={image} alt="" />
        ) : (
          <div className="mc-showroom-entrance__ph" />
        )}
        <div className="mc-showroom-entrance__scrim" />
        <div className="mc-showroom-entrance__grain" />
      </div>

      <div className="mc-showroom-entrance__body">
        <div className="mc-showroom-entrance__copy">
          <div className="mc-showroom-entrance__top">
            <p className="mc-showroom-entrance__kicker">{eyebrow}</p>
            {locked ? <span className="mc-showroom-entrance__status">Pronto</span> : null}
          </div>
          <h2 className="mc-showroom-entrance__title">{title}</h2>
          {sub ? <p className="mc-showroom-entrance__sub">{sub}</p> : null}
          <p className="mc-showroom-entrance__cta">
            <span>{cta}</span>
            <span className="mc-showroom-entrance__cta-line" aria-hidden />
          </p>
        </div>
      </div>
    </>
  )

  const cls = clsx(
    'mc-showroom-entrance',
    `mc-showroom-entrance--${layout}`,
    fullWidth && 'mc-showroom-entrance--full',
    preview && 'mc-showroom-entrance--preview',
    className,
  )

  const style = { '--sr-home-display': fontStack } as CSSProperties

  if (preview || !to) {
    return (
      <div className={cls} data-mood={copy.mood} data-layout={layout} style={style}>
        {body}
      </div>
    )
  }

  return (
    <Link to={to} className={cls} data-mood={copy.mood} data-layout={layout} style={style}>
      {body}
    </Link>
  )
}

export function ShowroomEntranceCard({ tenant }: { tenant: McTenant }) {
  const { to } = usePublicStore()
  if (!isCollectionShowroomPubliclyActive(tenant)) return null
  const showroom = resolveCollectionShowroom(tenant)
  if (!showroom) return null

  return (
    <ShowroomEntranceView
      showroom={showroom}
      to={to('/coleccion')}
      className="mb-5 sm:mb-7"
    />
  )
}
