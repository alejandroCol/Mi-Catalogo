/** Layout compartido — peek del hero y morph al carrusel. */
export const NORRIS_PEEK_CARDS = [
  { offsetX: -264, rotate: -13, y: 0, width: 274, z: 1 },
  { offsetX: -94, rotate: -4, y: -10, width: 302, z: 2 },
  { offsetX: 94, rotate: 4, y: -10, width: 302, z: 3 },
  { offsetX: 264, rotate: 13, y: 0, width: 274, z: 4 },
] as const

export function getNorrisPeekMetrics(vw: number, vh: number, index: number) {
  const mobile = vw < 768
  const spread = mobile ? 0.48 : 1
  const sizeMul = mobile ? 0.9 : 1
  const peek = NORRIS_PEEK_CARDS[index] ?? NORRIS_PEEK_CARDS[0]
  const width = peek.width * sizeMul
  const cardHeight = width * (10 / 16) + 48
  const x = vw / 2 + peek.offsetX * spread
  const y = vh - cardHeight * 0.26 + peek.y
  const rotate = peek.rotate * (mobile ? 0.88 : 1)

  return { x, y, width, rotate, cardHeight, z: peek.z }
}
