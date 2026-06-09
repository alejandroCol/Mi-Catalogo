import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isStaleChunkError, reloadForStaleChunks } from '@/lib/chunkLoadRecovery'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** Captura errores de render en rutas (p. ej. hooks inconsistentes) y ofrece recuperación. */
export class McRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isStaleChunkError(error, info.componentStack)) {
      reloadForStaleChunks()
      return
    }
    console.error('[McRouteErrorBoundary]', error, info.componentStack)
  }

  private reload = () => {
    reloadForStaleChunks()
  }

  render() {
    if (this.state.error) {
      if (isStaleChunkError(this.state.error)) {
        return null
      }

      return (
        <div className="mc-shell flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[15px] font-medium text-[var(--cat-text)]">Algo salió mal al cargar esta pantalla.</p>
          <p className="max-w-sm text-[13px] leading-relaxed text-[var(--cat-muted)]">
            Podés recargar la página; si el problema continúa, volvé a intentar en unos segundos.
          </p>
          <button type="button" className="mc-btn-primary px-6" onClick={this.reload}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
