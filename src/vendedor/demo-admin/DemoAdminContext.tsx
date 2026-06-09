import { createContext, useContext, type ReactNode } from 'react'
import type { McDemoStore } from '@/types/mc'
import type { DemoAdminDataset } from '@/vendedor/demo-admin/demoAdminMockData'
import { demoAdminBasePath } from '@/vendedor/demo-admin/demoAdminPaths'

export type DemoAdminContextValue = DemoAdminDataset & {
  demo: McDemoStore
  basePath: string
}

const DemoAdminContext = createContext<DemoAdminContextValue | null>(null)

type ProviderProps = {
  demo: McDemoStore
  dataset: DemoAdminDataset
  children: ReactNode
}

export function DemoAdminProvider({ demo, dataset, children }: ProviderProps) {
  const value: DemoAdminContextValue = {
    ...dataset,
    demo,
    basePath: demoAdminBasePath(demo.id),
  }
  return <DemoAdminContext.Provider value={value}>{children}</DemoAdminContext.Provider>
}

export function useDemoAdmin(): DemoAdminContextValue {
  const ctx = useContext(DemoAdminContext)
  if (!ctx) {
    throw new Error('useDemoAdmin debe usarse dentro de DemoAdminProvider')
  }
  return ctx
}
