import type { McCheckoutVentasModo } from '@/lib/checkoutVentasModo'

export function CheckoutVentasModoOptions({
  value,
  onSelect,
  disabled = false,
  pasarelaLista,
  pasarelaMicatalogoOk,
}: {
  value: McCheckoutVentasModo | null
  onSelect: (modo: McCheckoutVentasModo) => void
  disabled?: boolean
  pasarelaLista: boolean
  pasarelaMicatalogoOk: boolean
}) {
  const cardBase =
    'rounded-lg border px-4 py-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60'
  const cardSelected = 'border-mc-500 bg-mc-50/50 ring-1 ring-mc-400/40'
  const cardIdle = 'border-neutral-200/60 bg-neutral-50/20 hover:border-neutral-300/80'

  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('pasarela')}
        className={`${cardBase} ${value === 'pasarela' ? cardSelected : cardIdle}`}
      >
        <p className="text-[14px] font-semibold text-[var(--cat-text)]">Pasarela (OnePay)</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">
          El cliente puede pagar en línea en el checkout.
        </p>
        {!pasarelaLista ? (
          <p className="mt-2 text-[11px] font-medium text-amber-800">
            Creá tu empresa en OnePay para activar cobros con tarjeta, Nequi y PSE.
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-medium text-emerald-800">Pasarela lista para tu tienda.</p>
        )}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('pasarela_micatalogo')}
        className={`${cardBase} lg:min-h-[8.5rem] ${value === 'pasarela_micatalogo' ? cardSelected : cardIdle}`}
      >
        <p className="text-[14px] font-semibold text-[var(--cat-text)]">Pasarela sin registro OnePay</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">
          Cobrá en línea con la cuenta OnePay de Mi Catálogo. Retirás tus fondos cuando quieras desde Ventas.
        </p>
        <p className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/50 px-2 py-1.5 text-[11px] leading-snug text-amber-950">
          <span className="font-semibold">Costo al retirar fondos:</span> si no creás tu cuenta comercio en OnePay, al
          desembolsar el dinero se descontará <strong className="font-medium">0,02%</strong> más{' '}
          <strong className="font-medium">$900 COP</strong> sobre el monto a retirar.
        </p>
        {!pasarelaMicatalogoOk ? (
          <p className="mt-2 text-[11px] font-medium text-amber-800">
            El equipo de Mi Catálogo aún no activó esta pasarela.
          </p>
        ) : (
          <p className="mt-2 text-[11px] font-medium text-emerald-800">Disponible para tu checkout.</p>
        )}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect('whatsapp')}
        className={`${cardBase} ${value === 'whatsapp' ? cardSelected : cardIdle}`}
      >
        <p className="text-[14px] font-semibold text-[var(--cat-text)]">WhatsApp</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--cat-muted)]">
          Priorizás coordinar pago y entrega por WhatsApp; el checkout no muestra cobro con tarjeta.
        </p>
      </button>
    </div>
  )
}
