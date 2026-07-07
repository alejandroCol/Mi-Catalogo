import { mcPosPrinter } from '@/pos/lib/posPrinterService'

const SESSION_KEY = 'mc:pos:bridge-active'
const POLL_MS = 30000
const START_ATTEMPTS = 8
const START_INTERVAL_MS = 1500
const POS_BRIDGE_PROTOCOL = 'micatalogo-pos-bridge://start'

export type PosBridgeMonitorState = {
  /** Usuario pidió conectar el puente en esta sesión. */
  monitoring: boolean
  /** Ping en curso (botón «Iniciar puente»). */
  starting: boolean
  reachable: boolean
  bridgeUrl?: string
}

type Listener = (state: PosBridgeMonitorState) => void

let state: PosBridgeMonitorState = {
  monitoring: false,
  starting: false,
  reachable: false,
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let startTimer: ReturnType<typeof setTimeout> | null = null
let startAttempt = 0
const listeners = new Set<Listener>()

function readSessionActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeSessionActive(active: boolean) {
  try {
    if (active) sessionStorage.setItem(SESSION_KEY, '1')
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const fn of listeners) fn(state)
}

function clearPoll() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function clearStartSequence() {
  if (startTimer != null) {
    clearTimeout(startTimer)
    startTimer = null
  }
  startAttempt = 0
}

function stopMonitoring() {
  clearPoll()
  clearStartSequence()
  state = { ...state, monitoring: false, starting: false, reachable: false }
  writeSessionActive(false)
  emit()
}

async function pingOnce(bridgeUrl?: string): Promise<boolean> {
  return mcPosPrinter.refreshBridgeStatus(bridgeUrl)
}

function beginPoll(bridgeUrl?: string) {
  clearPoll()
  pollTimer = setInterval(() => {
    void pingOnce(bridgeUrl).then((ok) => {
      if (!state.monitoring) return
      if (ok !== state.reachable) {
        state = { ...state, reachable: ok }
        emit()
      }
      if (!ok) stopMonitoring()
    })
  }, POLL_MS)
}

function onStartSuccess(bridgeUrl?: string) {
  clearStartSequence()
  state = { ...state, monitoring: true, starting: false, reachable: true, bridgeUrl }
  writeSessionActive(true)
  emit()
  beginPoll(bridgeUrl)
}

function scheduleStartAttempt(bridgeUrl?: string) {
  if (startAttempt >= START_ATTEMPTS) {
    stopMonitoring()
    return
  }
  startAttempt += 1
  startTimer = setTimeout(() => {
    void pingOnce(bridgeUrl).then((ok) => {
      if (!state.starting) return
      if (ok) onStartSuccess(bridgeUrl)
      else scheduleStartAttempt(bridgeUrl)
    })
  }, START_INTERVAL_MS)
}

/** Intenta abrir el puente instalado en Windows vía protocolo personalizado (no hace nada si no está registrado). */
export function tryLaunchPosBridge(): void {
  try {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = POS_BRIDGE_PROTOCOL
    document.body.appendChild(iframe)
    window.setTimeout(() => iframe.remove(), 2500)
  } catch {
    /* ignore */
  }
}

/** Conecta al puente: lanza el servicio local (si existe) y hace ping; deja de escuchar si no responde. */
export function startPosBridgeMonitoring(bridgeUrl?: string): void {
  clearPoll()
  clearStartSequence()
  state = {
    monitoring: true,
    starting: true,
    reachable: false,
    bridgeUrl,
  }
  emit()

  tryLaunchPosBridge()
  scheduleStartAttempt(bridgeUrl)
}

export function stopPosBridgeMonitoring(): void {
  stopMonitoring()
}

export function getPosBridgeMonitorState(): PosBridgeMonitorState {
  return state
}

export function subscribePosBridgeMonitor(listener: Listener): () => void {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

/** Reanuda el polling solo si el puente ya estaba activo en esta pestaña. */
export function resumePosBridgeMonitoringIfNeeded(bridgeUrl?: string): void {
  if (!readSessionActive() || state.monitoring) return
  state = { ...state, monitoring: true, starting: false, bridgeUrl }
  void pingOnce(bridgeUrl).then((ok) => {
    if (ok) {
      state = { ...state, reachable: true }
      writeSessionActive(true)
      beginPoll(bridgeUrl)
    } else {
      stopMonitoring()
    }
    emit()
  })
}
