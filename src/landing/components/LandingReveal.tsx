import type { CSSProperties, ElementType, ReactNode } from 'react'
import clsx from 'clsx'
import { useLandingReveal } from '@/landing/hooks/useLandingReveal'

type Props = {
  children: ReactNode
  className?: string
  delay?: number
  variant?: 'up' | 'fade' | 'scale' | 'left' | 'right'
  as?: ElementType
}

export function LandingReveal({
  children,
  className,
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: Props) {
  const { ref, visible } = useLandingReveal<HTMLElement>({ threshold: 0.1 })

  return (
    <Tag
      ref={ref}
      className={clsx(
        'mc-landing-reveal',
        `mc-landing-reveal--${variant}`,
        visible && 'mc-landing-reveal--visible',
        className,
      )}
      style={{ '--mc-reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
