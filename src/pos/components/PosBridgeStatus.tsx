import { useSyncExternalStore } from 'react'
import {
  getPosBridgeMonitorState,
  subscribePosBridgeMonitor,
} from '@/pos/lib/posBridgeMonitor'
import { PosIcon } from '@/pos/components/PosIcon'
import type { McPosSedeConfig } from '@/types/mc'

export function PosBridgeStatus({ config }: { config?: McPosSedeConfig }) {
  const { reachable, starting, monitoring } = useSyncExternalStore(
    subscribePosBridgeMonitor,
    getPosBridgeMonitorState,
    () => ({ monitoring: false, starting: false, reachable: false }),
  )

  const bridgeHint = config?.urlBridge?.trim() || 'http://127.0.0.1:9123'
  const ok = reachable
  const label = starting
    ? 'Conectando…'
    : ok
      ? 'Impresora lista'
      : monitoring
        ? 'Sin puente'
        : 'Puente inactivo'

  return (
    <span
      className={`mc-pos-bridge-status ${ok ? 'mc-pos-bridge-status--ok' : 'mc-pos-bridge-status--off'}`}
      title={
        ok
          ? 'Bridge POS conectado'
          : starting
            ? 'Intentando conectar al puente local…'
            : `Bridge POS no detectado (${bridgeHint}). Usá «Iniciar puente» en Puente POS.`
      }
    >
      <PosIcon name={ok ? 'printer' : 'bridge'} size={14} className="mc-pos-bridge-status__icon" />
      <span className="mc-pos-bridge-status__dot" aria-hidden />
      {label}
    </span>
  )
}
