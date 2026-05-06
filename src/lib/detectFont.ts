// Only TrueType-outline fonts are listed here — CFF fonts (Merriweather,
// EB Garamond, etc.) crash react-pdf's fontkit in webpack-bundled environments.
const FONT_MAP: Array<{ patterns: RegExp[]; family: string }> = [
  { patterns: [/times/i, /cambria/i, /palatino/i, /minion/i, /garamond/i, /cormorant/i, /georgia/i, /lora/i], family: 'Lora' },
  { patterns: [/calibri/i, /trebuchet/i, /gill/i], family: 'Nunito' },
  { patterns: [/roboto/i], family: 'Roboto' },
  { patterns: [/helvetica/i, /arial/i, /opensans/i, /lato/i], family: 'Lato' },
]

const DEFAULT_FAMILY = 'Lato'

export function detectFont(buffer: Buffer): string {
  const raw = buffer.toString('latin1')
  // PDF BaseFont entries look like /BaseFont /TimesNewRomanPSMT or /BaseFont /ABCDEF+Arial-Bold
  const matches = [...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([^\s/\[\]<>()]+)/g)]

  const counts: Record<string, number> = {}
  for (const m of matches) {
    const name = m[1]
    if (/symbol|wingding|dingbat|zapf/i.test(name)) continue
    counts[name] = (counts[name] ?? 0) + 1
  }

  const topFont = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

  for (const { patterns, family } of FONT_MAP) {
    if (patterns.some((p) => p.test(topFont))) return family
  }

  return DEFAULT_FAMILY
}
