import { Font } from '@react-pdf/renderer'

// Google Fonts CSS API v1 — returns @font-face blocks with TTF src URLs
const GOOGLE_FONT_QUERIES: Record<string, string> = {
  Merriweather: 'Merriweather:400,700,400italic,700italic',
  'EB Garamond': 'EB+Garamond:400,700,400italic,700italic',
  Lora: 'Lora:400,700,400italic,700italic',
  Nunito: 'Nunito:400,700,400italic,700italic',
  Lato: 'Lato:400,700,400italic,700italic',
  Roboto: 'Roboto:400,700,400italic,700italic',
}

const _registered = new Set<string>()

function parseTtfUrls(css: string) {
  const fonts: { url: string; fontWeight: number; fontStyle: 'normal' | 'italic' }[] = []
  const blockRe = /@font-face\s*\{([^}]+)\}/g
  let block
  while ((block = blockRe.exec(css)) !== null) {
    const body = block[1]
    const styleMatch = body.match(/font-style:\s*(normal|italic)/)
    const weightMatch = body.match(/font-weight:\s*(\d+)/)
    const srcMatch = body.match(/url\(([^)]+\.ttf)\)/)
    if (styleMatch && weightMatch && srcMatch) {
      fonts.push({
        url: srcMatch[1],
        fontWeight: parseInt(weightMatch[1]),
        fontStyle: styleMatch[1] as 'normal' | 'italic',
      })
    }
  }
  return fonts
}

// Fetch the font file and return a base64 data URI so react-pdf doesn't
// need to make network requests internally during renderToBuffer (which
// can fail in webpack-bundled environments due to fontkit internals).
async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status} ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return `data:font/truetype;base64,${buffer.toString('base64')}`
}

export async function ensureFontRegistered(family: string): Promise<string> {
  if (_registered.has(family)) return family

  const query = GOOGLE_FONT_QUERIES[family]
  if (!query) return 'Helvetica'

  try {
    const res = await fetch(`https://fonts.googleapis.com/css?family=${query}`)
    if (!res.ok) throw new Error(`Google Fonts API returned ${res.status}`)
    const css = await res.text()
    const urlEntries = parseTtfUrls(css)
    if (urlEntries.length === 0) throw new Error('No TTF URLs in Google Fonts CSS')

    // Fetch all font files and convert to data URIs in parallel
    const fonts = await Promise.all(
      urlEntries.map(async (entry) => ({
        src: await toDataUri(entry.url),
        fontWeight: entry.fontWeight,
        fontStyle: entry.fontStyle,
      }))
    )

    Font.register({ family, fonts })
    _registered.add(family)
    return family
  } catch (err) {
    console.warn(`[registerFont] Failed to register "${family}", falling back to Helvetica:`, err)
    return 'Helvetica'
  }
}
