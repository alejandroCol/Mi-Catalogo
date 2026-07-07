import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMcAuth } from '@/auth/McAuthContext'
import {
  IconChartBars,
  IconClipboard,
  IconGraduationCap,
  IconLink,
  IconPhotoStack,
  IconSliders,
} from '@/icons/McIcons'
import { VendedorDashboardTile } from '@/vendedor/components/VendedorDashboardTile'
import { VendedorStatLink } from '@/vendedor/components/VendedorStatLink'
import { RegistrarVisitaModal } from '@/vendedor/RegistrarVisitaModal'
import { VerDemoModal } from '@/vendedor/VerDemoModal'
import { PosOmnichannelDemoModal } from '@/vendedor/PosOmnichannelDemoModal'
import { useSalesRepVisits } from '@/vendedor/hooks/useSalesRepVisits'
import type { McDemoStore } from '@/types/mc'

export function VendedorDashboardPage() {
  const { profile } = useMcAuth()
  const nav = useNavigate()
  const { stats, loading } = useSalesRepVisits(profile?.uid)
  const [visitaOpen, setVisitaOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoFocus, setDemoFocus] = useState<'public' | 'admin'>('public')
  const [posDemoOpen, setPosDemoOpen] = useState(false)
  const [posDemoFocus, setPosDemoFocus] = useState<'admin' | 'vendedora'>('admin')

  function onViewAdmin(store: McDemoStore) {
    setDemoOpen(false)
    nav(`/vendedor/demo-admin/${store.id}`)
  }

  const firstName = profile?.displayName?.split(' ')[0]

  return (
    <div className="mc-vendedor-page">
      <section className="mc-vendedor-hero">
        <p className="mc-landing-eyebrow">Panel de ventas</p>
        <h1 className="mc-landing-title">
          Hola{firstName ? `, ${firstName}` : ''}.
          <span className="mc-landing-title__accent"> Cerrá más marcas hoy.</span>
        </h1>
        <p className="mc-landing-lead">
          Tu centro de operaciones para visitar tiendas, mostrar demos y presentar el pitch con la misma calidad que
          nuestra landing.
        </p>
      </section>

      <section aria-label="Resumen">
        <div className="mc-vendedor-stats">
          <div className="mc-vendedor-stat">
            <p className="mc-vendedor-stat__label">Visitadas</p>
            <p className="mc-vendedor-stat__value">{loading ? '—' : stats.total}</p>
          </div>
          <VendedorStatLink
            to="/vendedor/vendidas"
            label="Vendidas"
            value={stats.vendidas}
            loading={loading}
            accent="gold"
          />
        </div>
      </section>

      <section aria-label="Módulos">
        <div className="mc-vendedor-section-head">
          <p className="mc-landing-eyebrow">Herramientas</p>
          <h2 className="mc-landing-title">
            Todo lo que necesitás
            <span className="mc-landing-title__accent"> en campo</span>
          </h2>
        </div>
        <div className="mc-vendedor-bento">
          <VendedorDashboardTile
            to="/vendedor/pitch"
            icon={<IconPhotoStack size={20} />}
            title="Ver pitch"
            description="Presentación en slides para tablet horizontal, con comparativo vs Shopify."
            accent="dark"
            size="large"
          />
          <VendedorDashboardTile
            onClick={() => setVisitaOpen(true)}
            icon={<IconClipboard size={20} />}
            title="Registrar visita"
            description="Anotá la tienda y el resultado de la reunión."
            accent="neutral"
            size="small"
          />
          <VendedorDashboardTile
            onClick={() => {
              setDemoFocus('public')
              setDemoOpen(true)
            }}
            icon={<IconLink size={20} />}
            title="Ver demo"
            description="Catálogo público de tiendas demo por rubro."
            accent="gold"
            size="small"
          />
          <VendedorDashboardTile
            onClick={() => {
              setDemoFocus('admin')
              setDemoOpen(true)
            }}
            icon={<IconSliders size={20} />}
            title="Ver como admin"
            description="Panel del comerciante con datos de ejemplo."
            accent="neutral"
            size="small"
          />
          <VendedorDashboardTile
            onClick={() => {
              setPosDemoFocus('admin')
              setPosDemoOpen(true)
            }}
            icon={<IconChartBars size={20} />}
            title="Demo POS"
            description="Cargá data demo para reportes, entrá al POS real o al mock offline."
            accent="gold"
            size="medium"
          />
          <VendedorDashboardTile
            to="/vendedor/capacitacion"
            icon={<IconGraduationCap size={20} />}
            title="Capacitación"
            description="Estrategias de venta presencial y checklist antes de salir."
            accent="gold"
            size="medium"
          />
        </div>
      </section>

      {!loading && stats.total > 0 ? (
        <section className="mc-vendedor-panel--dark mc-vendedor-panel relative">
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-2">
              <IconChartBars size={18} className="text-[var(--mc-landing-gold)]" />
              <h2 className="text-lg font-semibold tracking-tight">Tu desempeño</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center sm:gap-6">
              <Link to="/vendedor/vendidas" className="mc-vendedor-perf-stat group">
                <p className="text-[1.75rem] font-semibold tracking-tighter text-[var(--mc-landing-gold)] sm:text-[2rem]">
                  {stats.vendidas}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] opacity-70">Exitosas</p>
              </Link>
              <Link to="/vendedor/pendientes" className="mc-vendedor-perf-stat group">
                <p className="text-[1.75rem] font-semibold tracking-tighter sm:text-[2rem]">{stats.pendientes}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] opacity-70">Pendientes</p>
              </Link>
              <Link to="/vendedor/rechazos" className="mc-vendedor-perf-stat group">
                <p className="text-[1.75rem] font-semibold tracking-tighter sm:text-[2rem]">{stats.rechazos}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] opacity-70">Rechazos</p>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mc-vendedor-tip">
        <span className="mc-vendedor-tip__icon" aria-hidden>
          ✦
        </span>
        <div>
          <p className="text-base font-semibold tracking-tight text-mc-brand-gray">Tip antes de cada visita</p>
          <p className="mt-2 text-sm leading-relaxed text-mc-600">
            Abrí el pitch en la tablet, elegí una demo del mismo rubro y mostrá la marca reflejada en pantalla antes de
            hablar de precio.
          </p>
        </div>
      </section>

      {profile ? (
        <RegistrarVisitaModal
          open={visitaOpen}
          onClose={() => setVisitaOpen(false)}
          salesRepUid={profile.uid}
          salesRepName={profile.displayName || profile.email}
        />
      ) : null}

      <VerDemoModal
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onViewAdmin={onViewAdmin}
        focus={demoFocus}
      />
      <PosOmnichannelDemoModal
        open={posDemoOpen}
        onClose={() => setPosDemoOpen(false)}
        focus={posDemoFocus}
      />
    </div>
  )
}
