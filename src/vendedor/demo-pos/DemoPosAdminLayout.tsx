import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDemoStores } from '@/vendedor/hooks/useDemoStores'
import { buildDemoPosDataset } from '@/vendedor/demo-pos/demoPosMockData'
import { DemoPosProvider } from '@/vendedor/demo-pos/DemoPosContext'
import { DemoPosAdminShell } from '@/vendedor/demo-pos/DemoPosAdminShell'

export function DemoPosAdminLayout() {
  const { demoId } = useParams<{ demoId: string }>()
  const { stores, loading } = useDemoStores(true)
  const demo = stores.find((s) => s.id === demoId)
  const dataset = useMemo(() => (demo ? buildDemoPosDataset(demo) : null), [demo])

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[#f6f5f2]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" aria-hidden />
        <p className="text-sm text-neutral-600">Cargando demo POS admin…</p>
      </div>
    )
  }

  if (!demo || !dataset) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#f6f5f2] px-6 text-center">
        <p className="text-base text-neutral-700">Tienda demo no encontrada.</p>
        <Link
          to="/vendedor"
          className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 no-underline"
        >
          Volver al panel vendedor
        </Link>
      </div>
    )
  }

  return (
    <DemoPosProvider demo={demo} dataset={dataset}>
      <DemoPosAdminShell />
    </DemoPosProvider>
  )
}
