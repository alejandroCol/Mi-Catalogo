import { useEffect, useSyncExternalStore } from 'react'
import { mcPosPrinter } from '@/pos/lib/posPrinterService'
import { onMcPosVenta } from '@/pos/lib/posEvents'
import {
  getPosBridgeMonitorState,
  resumePosBridgeMonitoringIfNeeded,
  subscribePosBridgeMonitor,
} from '@/pos/lib/posBridgeMonitor'
import type { McPosSedeConfig } from '@/types/mc'

/** Escucha ventas confirmadas e imprime ticket / abre cajón. El puente solo se consulta si el usuario lo inició. */
export function usePosHardware(config?: McPosSedeConfig) {
  const bridgeUrl = config?.urlBridge?.trim() || undefined

  const bridgeState = useSyncExternalStore(
    subscribePosBridgeMonitor,
    getPosBridgeMonitorState,
    () => ({ monitoring: false, starting: false, reachable: false }),
  )

  useEffect(() => {
    resumePosBridgeMonitoringIfNeeded(bridgeUrl)
  }, [bridgeUrl])

  useEffect(() => {
    return onMcPosVenta((payload) => {
      void mcPosPrinter.handleVenta(payload)
    })
  }, [])

  return { bridgeOk: bridgeState.reachable, bridgeStarting: bridgeState.starting }
}
