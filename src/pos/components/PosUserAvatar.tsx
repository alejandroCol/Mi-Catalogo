type Props = {
  name: string
  size?: 'sm' | 'md'
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function hueFromName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function PosUserAvatar({ name, size = 'sm' }: Props) {
  const initials = initialsFromName(name)
  const hue = hueFromName(name)
  return (
    <span
      className={`mc-pos-user-avatar mc-pos-user-avatar--${size}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 42% 88%) 0%, hsl(${(hue + 40) % 360} 38% 78%) 100%)`,
        color: `hsl(${hue} 35% 28%)`,
      }}
      title={name}
      aria-hidden
    >
      {initials}
    </span>
  )
}
