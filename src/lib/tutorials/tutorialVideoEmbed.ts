/** Convierte URL de YouTube o Vimeo a URL embebible para iframe. */
export function getTutorialVideoEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null

  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com/video/')) {
    return url
  }

  const ytWatch = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/embed\/)([\w-]{11})/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`

  const ytShort = url.match(/youtu\.be\/([\w-]{11})/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`

  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`

  return null
}

export function isTutorialVideoUrlValid(raw: string): boolean {
  return getTutorialVideoEmbedUrl(raw) !== null
}
