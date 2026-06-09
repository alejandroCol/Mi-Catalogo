import { lazy as reactLazy, type ComponentType, type LazyExoticComponent } from 'react'
import { reloadForStaleChunks } from '@/lib/chunkLoadRecovery'

type ModuleDefault<T> = { default: T }

function reloadOnceOnChunkError(error: unknown): never {
  reloadForStaleChunks()
  throw error
}

/** Lazy route chunks: si falla la carga (deploy/cache), recarga una vez antes de propagar el error. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<ModuleDefault<T>>,
): LazyExoticComponent<T> {
  return reactLazy(() => factory().catch(reloadOnceOnChunkError))
}
