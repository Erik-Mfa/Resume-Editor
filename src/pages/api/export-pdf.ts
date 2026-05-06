import type { NextApiRequest, NextApiResponse } from 'next'
import { createElement } from 'react'
import { Font, renderToBuffer } from '@react-pdf/renderer'
import { ResumePdfDocument } from '@/components/ResumePdfDocument'
import { isResumeData } from '@/lib/resumeSchema'

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

// Only TrueType-outline fonts — CFF fonts crash react-pdf fontkit in webpack.
// Google Fonts CSS API v1 returns @font-face blocks with .ttf src URLs.
const GOOGLE_FONT_QUERIES: Record<string, string> = {
  Lora:   'Lora:400,700,400italic,700italic',
  Nunito: 'Nunito:400,700,400italic,700italic',
  Lato:   'Lato:400,700,400italic,700italic',
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
      fonts.push({ url: srcMatch[1], fontWeight: parseInt(weightMatch[1]), fontStyle: styleMatch[1] as 'normal' | 'italic' })
    }
  }
  return fonts
}

async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return `data:font/truetype;base64,${buffer.toString('base64')}`
}

async function ensureFontRegistered(family: string): Promise<string> {
  if (_registered.has(family)) return family

  const query = GOOGLE_FONT_QUERIES[family]
  if (!query) return 'Helvetica'

  try {
    const res = await fetch(`https://fonts.googleapis.com/css?family=${query}`)
    if (!res.ok) throw new Error(`Google Fonts API returned ${res.status}`)
    const css = await res.text()
    const urlEntries = parseTtfUrls(css)
    if (urlEntries.length === 0) throw new Error('No TTF URLs found')

    const fonts = await Promise.all(
      urlEntries.map(async (e) => ({
        src: await toDataUri(e.url),
        fontWeight: e.fontWeight,
        fontStyle: e.fontStyle,
      }))
    )

    Font.register({ family, fonts })
    _registered.add(family)
    console.log(`[export-pdf] Registered font "${family}" (${fonts.length} variants)`)
    return family
  } catch (err) {
    console.warn(`[export-pdf] Font registration failed for "${family}", using Helvetica:`, err)
    return 'Helvetica'
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const resumeData = (req.body as Record<string, unknown>)?.data
  if (!isResumeData(resumeData)) {
    return res.status(400).json({ error: 'Invalid resume data.' })
  }

  try {
    const resolvedFamily = await ensureFontRegistered(resumeData.fontFamily ?? '')
    const dataWithFont = { ...resumeData, fontFamily: resolvedFamily }
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(ResumePdfDocument, { resumeData: dataWithFont }) as any
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="adapted-resume.pdf"')
    res.status(200).send(Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('PDF render error:', err)
    res.status(500).json({ error: 'Failed to generate PDF.' })
  }
}
