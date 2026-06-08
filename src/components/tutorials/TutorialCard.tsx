import { TutorialVideoEmbed } from '@/components/tutorials/TutorialVideoEmbed'
import type { McTutorialWithId } from '@/lib/tutorials/types'

type Props = {
  tutorial: McTutorialWithId
  index: number
}

export function TutorialCard({ tutorial, index }: Props) {
  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-[var(--cat-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <TutorialVideoEmbed videoUrl={tutorial.videoUrl} title={tutorial.title} className="rounded-none" />
      <div className="space-y-2 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mc-100 text-[13px] font-semibold text-mc-800">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="ios-headline text-[17px] font-semibold leading-snug text-[var(--cat-text)]">
              {tutorial.title}
            </h3>
            {tutorial.description ? (
              <p className="ios-subhead mt-1.5 leading-relaxed text-[var(--cat-muted)]">{tutorial.description}</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
