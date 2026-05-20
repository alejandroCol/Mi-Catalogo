import type { ReactNode } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones/ConfiguracionesBackLink'

type Props = {
  title: string
  children: ReactNode
  headerExtra?: ReactNode
}

export function ConfiguracionesSubpageLayout({ title, children, headerExtra }: Props) {
  return (
    <div className="mc-shell mc-config-subpage">
      <ConfiguracionesBackLink />
      <div className="space-y-2">
        <h1 className="ios-large-title">{title}</h1>
        {headerExtra}
      </div>
      {children}
    </div>
  )
}
