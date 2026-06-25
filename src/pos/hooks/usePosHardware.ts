import { useEffect, useState } from 'react'
import { mcPosPrinter } from '@/pos/lib/posPrinterService'
import { onMcPosVenta } from '@/pos/lib/posEvents'
import type { McPosSedeConfig } from '@/types/mc'

/** Escucha ventas confirmadas e imprime ticket / abre cajón. */
export function usePosHardware(config?: McPosSedeConfig) {
  const [bridgeOk, setBridgeOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    mcPosPrinter.refreshBridgeStatus(config?.urlBridge).then((ok) => {
      if (!cancelled) setBridgeOk(ok)
    })
    const interval = window.setInterval(() => {
      mcPosPrinter.refreshBridgeStatus(config?.urlBridge).then((ok) => {
        if (!cancelled) setBridgeOk(ok)
      })
    }, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [config?.urlBridge])

  useEffect(() => {
    return onMcPosVenta((payload) => {
      void mcPosPrinter.handleVenta(payload)
    })
  }, [])

  return { bridgeOk }
}
