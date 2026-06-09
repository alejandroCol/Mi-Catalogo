const RELOAD_COUNT_KEY = 'mc:chunk-reload-n'
const MAX_RELOADS = 3
const VERSION_POLL_MS = 5 * 60 * 1000

const CHUNK_FAILURE_MESSAGES = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'error loading dynamically imported module',
  'failed to load module script',
] as const

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error ?? '')
}

function errorContext(error: unknown, componentStack?: string | null): string {
  const stack = error instanceof Error ? error.stack : ''
  return `${stack}\n${componentStack ?? ''}`.toLowerCase()
}

export function extractEntryHashFromHtml(html: string): string | null {
  const match = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/)
  return match?.[1] ?? null
}

export function getLoadedEntryHash(): string | null {
  const script = document.querySelector('script[type="module"][src*="/assets/index-"]')
  if (!(script instanceof HTMLScriptElement)) return null
  const match = script.src.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/)
  return match?.[1] ?? null
}

export function isChunkLoadFailureMessage(message: string): boolean {
  const m = message.toLowerCase()
  return CHUNK_FAILURE_MESSAGES.some((fragment) => m.includes(fragment))
}

/** Detecta errores de chunks viejos tras deploy (MIME text/html, lazy import roto, etc.). */
export function isStaleChunkError(error: unknown, componentStack?: string | null): boolean {
  const message = normalizeErrorMessage(error)
  if (isChunkLoadFailureMessage(message)) return true

  const context = errorContext(error, componentStack)
  if (
    message.toLowerCase().includes("cannot read properties of undefined (reading 'default')") &&
    (context.includes('/assets/') || context.includes('lazy'))
  ) {
    return true
  }

  return false
}

/** Recarga con cache-bust para obtener index.html y chunks del deploy actual. */
export function reloadForStaleChunks(): void {
  const count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0')
  if (count >= MAX_RELOADS) return
  sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1))
  const url = new URL(window.location.href)
  url.searchParams.set('_mc', String(Date.now()))
  window.location.replace(url.toString())
}

let installed = false

/**
 * Recuperación ante chunks viejos tras un deploy (MIME text/html, import fallido).
 * Idempotente: index.html también instala un bootstrap equivalente.
 */
export function installChunkLoadRecovery(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForStaleChunks()
  })

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target
      if (
        target instanceof HTMLScriptElement &&
        target.src.includes('/assets/') &&
        (event.message.toLowerCase().includes('mime') ||
          event.message.toLowerCase().includes('module script') ||
          !event.message)
      ) {
        reloadForStaleChunks()
      }
    },
    true,
  )

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadFailureMessage(normalizeErrorMessage(event.reason))) return
    event.preventDefault()
    reloadForStaleChunks()
  })

  window.addEventListener('load', () => {
    window.setTimeout(() => sessionStorage.removeItem(RELOAD_COUNT_KEY), 4000)
  })
}

let versionCheckInstalled = false

/** Compara el hash del entry en index.html remoto vs el bundle cargado; recarga si hay deploy nuevo. */
export function installDeployVersionCheck(): void {
  if (versionCheckInstalled || typeof window === 'undefined') return
  if (!getLoadedEntryHash()) return

  versionCheckInstalled = true
  let checking = false

  async function checkForNewDeploy(): Promise<void> {
    if (checking || document.visibilityState === 'hidden') return
    checking = true
    try {
      const res = await fetch('/index.html', { cache: 'no-store', credentials: 'same-origin' })
      if (!res.ok) return
      const remoteHash = extractEntryHashFromHtml(await res.text())
      const loadedHash = getLoadedEntryHash()
      if (remoteHash && loadedHash && remoteHash !== loadedHash) {
        reloadForStaleChunks()
      }
    } catch {
      /* ignorar errores de red */
    } finally {
      checking = false
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForNewDeploy()
  })

  window.setInterval(() => void checkForNewDeploy(), VERSION_POLL_MS)
}
