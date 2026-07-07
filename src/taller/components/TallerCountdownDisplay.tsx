import type { TallerCountdownParts } from '@/taller/useTallerCountdown'

type Props = {
  countdown: TallerCountdownParts
  className?: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="mc-taller-countdown__unit">
      <span className="mc-taller-countdown__value">{pad(value)}</span>
      <span className="mc-taller-countdown__label">{label}</span>
    </div>
  )
}

export function TallerCountdownDisplay({ countdown, className = '' }: Props) {
  return (
    <div className={`mc-taller-countdown ${className}`} role="timer" aria-live="polite">
      <Unit value={countdown.days} label="días" />
      <span className="mc-taller-countdown__sep" aria-hidden>
        :
      </span>
      <Unit value={countdown.hours} label="horas" />
      <span className="mc-taller-countdown__sep" aria-hidden>
        :
      </span>
      <Unit value={countdown.minutes} label="min" />
      <span className="mc-taller-countdown__sep" aria-hidden>
        :
      </span>
      <Unit value={countdown.seconds} label="seg" />
    </div>
  )
}
