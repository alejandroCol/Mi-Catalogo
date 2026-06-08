import clsx from 'clsx'
import { getTutorialVideoEmbedUrl } from '@/lib/tutorials/tutorialVideoEmbed'

type Props = {
  videoUrl: string
  title: string
  className?: string
}

export function TutorialVideoEmbed({ videoUrl, title, className }: Props) {
  const embedUrl = getTutorialVideoEmbedUrl(videoUrl)

  if (!embedUrl) {
    return (
      <div
        className={clsx(
          'flex aspect-video items-center justify-center rounded-xl border border-dashed border-neutral-300/80 bg-neutral-50/80',
          className,
        )}
      >
        <p className="ios-footnote px-4 text-center text-[var(--cat-muted)]">Video no disponible</p>
      </div>
    )
  }

  return (
    <div className={clsx('relative aspect-video overflow-hidden rounded-xl bg-neutral-900 shadow-sm', className)}>
      <iframe
        src={embedUrl}
        title={title}
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
