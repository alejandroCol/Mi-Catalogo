import type { ReactNode } from 'react'
import clsx from 'clsx'

type Props = {
  id?: string
  children: ReactNode
  className?: string
  containerClassName?: string
  dark?: boolean
}

export function LandingSection({
  id,
  children,
  className = '',
  containerClassName = '',
  dark = false,
}: Props) {
  return (
    <section
      id={id}
      className={clsx('mc-landing-section', dark && 'mc-landing-section--dark', className)}
    >
      <div className={clsx('mc-landing-container', containerClassName)}>{children}</div>
    </section>
  )
}
