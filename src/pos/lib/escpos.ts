/** Comandos ESC/POS para impresoras compatibles Epson (58 mm). */

export type EscPosAlign = 'left' | 'center' | 'right'
export type EscPosTextSize = 'normal' | 'double-height' | 'double-width' | 'double'
export type EscPosDrawerPin = 0 | 1

const ALIGN: Record<EscPosAlign, number> = { left: 0, center: 1, right: 2 }

export function escPosSanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '?')
}

export class EscPosEncoder {
  private bytes: number[] = []

  raw(data: number[] | Uint8Array): this {
    for (const b of data) this.bytes.push(b & 0xff)
    return this
  }

  init(): this {
    return this.raw([0x1b, 0x40])
  }

  align(mode: EscPosAlign): this {
    return this.raw([0x1b, 0x61, ALIGN[mode]])
  }

  bold(on: boolean): this {
    return this.raw([0x1b, 0x45, on ? 1 : 0])
  }

  size(mode: EscPosTextSize): this {
    const n =
      mode === 'double'
        ? 0x11
        : mode === 'double-height'
          ? 0x01
          : mode === 'double-width'
            ? 0x10
            : 0x00
    return this.raw([0x1d, 0x21, n])
  }

  text(line: string): this {
    const safe = escPosSanitize(line)
    for (let i = 0; i < safe.length; i++) this.bytes.push(safe.charCodeAt(i) & 0xff)
    return this
  }

  newline(count = 1): this {
    for (let i = 0; i < count; i++) this.bytes.push(0x0a)
    return this
  }

  openDrawer(pin: EscPosDrawerPin = 0, onTime = 50, offTime = 250): this {
    return this.raw([0x1b, 0x70, pin, onTime, offTime])
  }

  feed(lines = 3): this {
    return this.raw([0x1b, 0x64, lines])
  }

  cut(): this {
    return this.raw([0x1d, 0x56, 0x00])
  }

  build(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

export function concatEscPos(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

export function escPosLinePair(left: string, right: string, width: number): string {
  const l = escPosSanitize(left)
  const r = escPosSanitize(right)
  const gap = width - l.length - r.length
  if (gap >= 1) return l + ' '.repeat(gap) + r
  if (l.length + r.length <= width) return (l + ' ' + r).slice(0, width)
  return (l.slice(0, Math.max(1, width - r.length - 1)) + ' ' + r).slice(0, width)
}

export function escPosWrap(text: string, width: number): string[] {
  const words = escPosSanitize(text).split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!w) continue
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= width) {
      cur = next
    } else {
      if (cur) lines.push(cur)
      cur = w.length > width ? w.slice(0, width) : w
      while (cur.length > width) {
        lines.push(cur.slice(0, width))
        cur = cur.slice(width)
      }
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

export function escPosRule(width: number, char = '-'): string {
  return char.repeat(width)
}
