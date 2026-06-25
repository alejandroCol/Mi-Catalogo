import { createContext, useContext, type ReactNode } from 'react'
import type { McDemoStore } from '@/types/mc'
import type { DemoPosDataset } from '@/vendedor/demo-pos/demoPosMockData'

export type DemoPosContextValue = DemoPosDataset & {
  demo: McDemoStore
}

const DemoPosContext = createContext<DemoPosContextValue | null>(null)

type ProviderProps = {
  demo: McDemoStore
  dataset: DemoPosDataset
  children: ReactNode
}

export function DemoPosProvider({ demo, dataset, children }: ProviderProps) {
  const value: DemoPosContextValue = { ...dataset, demo }
  return <DemoPosContext.Provider value={value}>{children}</DemoPosContext.Provider>
}

export function useDemoPos(): DemoPosContextValue {
  const ctx = useContext(DemoPosContext)
  if (!ctx) throw new Error('useDemoPos debe usarse dentro de DemoPosProvider')
  return ctx
}
