import type { ReactNode } from 'react'
import { ConfiguracionesBackLink } from '@/app/configuraciones/ConfiguracionesBackLink'

type Props = {
  title: string
  children: ReactNode
  headerExtra?: ReactNode
  backTo?: string
  backLabel?: string
}

export function ConfiguracionesSubpageLayout({ title, children, headerExtra, backTo, backLabel }: Props) {
  return (
    <div className="mc-shell mc-config-subpage">
      <ConfiguracionesBackLink to={backTo} label={backLabel} />
      <div className="space-y-2">
        <h1 className="ios-large-title">{title}</h1>
        {headerExtra}
      </div>
      {children}
    </div>
  )
}
