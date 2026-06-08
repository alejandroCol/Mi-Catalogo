import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { DASHBOARD_RETURN_NAV } from '@/app/configuraciones/configSubpageNav'
import { useMcAuth } from '@/auth/McAuthContext'
import { IconChevronRight } from '@/icons/McIcons'
import { firebaseConfigured, getDb } from '@/lib/firebase'
import { MC } from '@/lib/mcCollections'

export function NewStoreReadyToShareCard() {
  const { effectiveTenantId } = useMcAuth()
  const navigate = useNavigate()
  const [markingSeen, setMarkingSeen] = useState(false)

  async function handleOpenShare() {
    if (markingSeen) return
    setMarkingSeen(true)

    if (firebaseConfigured && effectiveTenantId) {
      void updateDoc(doc(getDb(), MC.tenants, effectiveTenantId), {
        onboardingSharePromptSeenAt: Date.now(),
      }).catch(() => {
        /* onSnapshot actualiza el tenant; si falla, el CTA puede reaparecer */
      })
    }

    navigate('/app/cuenta/tienda', { state: DASHBOARD_RETURN_NAV })
  }

  return (
    <section
      aria-label="Estás listo para vender. Compartí tu tienda."
      className="relative left-1/2 w-screen -translate-x-1/2"
    >
      <button
        type="button"
        onClick={() => void handleOpenShare()}
        disabled={markingSeen}
        className="group relative block w-full cursor-pointer border-y border-[color-mix(in_srgb,#c5a367_22%,transparent)] bg-gradient-to-r from-[#100e0c] via-[#16120f] to-[#100e0c] text-left transition hover:from-[#14110e] hover:via-[#1a1612] hover:to-[#14110e] active:from-[#181410] active:via-[#1d1914] active:to-[#181410] disabled:cursor-wait"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_130%_at_0%_50%,color-mix(in_srgb,#c5a367_16%,transparent),transparent_58%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_90%_at_100%_50%,color-mix(in_srgb,#8b6d42_10%,transparent),transparent_55%)]"
          aria-hidden
        />

        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5 lg:px-12">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,#c5a367_35%,transparent)] bg-[color-mix(in_srgb,#c5a367_12%,transparent)] text-[#d4b37a] shadow-[0_0_0_1px_color-mix(in_srgb,#c5a367_8%,transparent)]"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 1.75 6.85 4.1 9.35 4.35 7.45 6 8.05 8.45 6 7.2 3.95 8.45 4.55 6 2.65 4.35 5.15 4.1Z"
                fill="currentColor"
              />
            </svg>
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium leading-snug tracking-tight text-[color-mix(in_srgb,white_96%,#c5a367_4%)] sm:text-[15px]">
              Estás listo para vender
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-[color-mix(in_srgb,#c5a367_72%,white_28%)] sm:text-[13px]">
              Compartí tu tienda y empezá a vender
            </span>
          </span>

          <IconChevronRight
            size={16}
            className="shrink-0 text-[color-mix(in_srgb,#c5a367_45%,transparent)] transition group-hover:translate-x-0.5 group-hover:text-[color-mix(in_srgb,#c5a367_78%,white_22%)]"
            aria-hidden
          />
        </div>
      </button>
    </section>
  )
}
