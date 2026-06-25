import { useEffect, useState } from 'react'
import { mcPosPrinter } from '@/pos/lib/posPrinterService'
import { PosIcon } from '@/pos/components/PosIcon'
import type { McPosSedeConfig } from '@/types/mc'

export function PosBridgeStatus({ config }: { config?: McPosSedeConfig }) {
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = () =>
      mcPosPrinter.refreshBridgeStatus(config?.urlBridge).then((reachable) => {
        if (!cancelled) setOk(reachable)
      })
    check()
    const id = window.setInterval(check, 20000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [config?.urlBridge])

  return (
    <span
      className={`mc-pos-bridge-status ${ok ? 'mc-pos-bridge-status--ok' : 'mc-pos-bridge-status--off'}`}
      title={ok ? 'Bridge POS conectado' : 'Bridge POS no detectado (http://127.0.0.1:9123)'}
    >
      <PosIcon name={ok ? 'printer' : 'bridge'} size={14} className="mc-pos-bridge-status__icon" />
      <span className="mc-pos-bridge-status__dot" aria-hidden />
      {ok ? 'Impresora lista' : 'Sin puente'}
    </span>
  )
}
