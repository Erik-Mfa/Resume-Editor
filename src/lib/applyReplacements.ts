import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx'
import type { TextReplacement } from './genAi'

// ── DOCX in-place editing ──────────────────────────────────────────────

export async function applyToDocx(
  buffer: Buffer,
  replacements: TextReplacement[]
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer)
  const docXml = zip.file('word/document.xml')
  if (!docXml) throw new Error('Invalid DOCX: missing word/document.xml')

  let xml = await docXml.async('string')

  for (const { old: oldText, new: newText } of replacements) {
    xml = replaceTextInXml(xml, oldText, newText)
  }

  zip.file('word/document.xml', xml)
  const output = await zip.generateAsync({ type: 'nodebuffer' })
  return Buffer.from(output)
}

function replaceTextInXml(xml: string, oldText: string, newText: string): string {
  // Try direct replacement first (works when text isn't split across runs)
  if (xml.includes(oldText)) {
    return xml.replace(oldText, escapeXml(newText))
  }

  // Handle Word's run-splitting: text may be split across multiple <w:t> nodes
  // within a single <w:p> paragraph. We reconstruct paragraph text, match, and
  // redistribute the replacement across the affected <w:t> nodes.
  const paragraphRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
  return xml.replace(paragraphRegex, (paragraph) => {
    const textNodes: { match: string; text: string; index: number }[] = []
    const wtRegex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g
    let m: RegExpExecArray | null

    while ((m = wtRegex.exec(paragraph)) !== null) {
      textNodes.push({ match: m[0], text: m[1], index: m.index })
    }

    if (textNodes.length === 0) return paragraph

    const concatenated = textNodes.map((n) => n.text).join('')
    const pos = concatenated.indexOf(oldText)
    if (pos === -1) return paragraph

    // Find which <w:t> nodes are affected
    let charOffset = 0
    let result = paragraph
    let replaced = false

    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i]
      const nodeStart = charOffset
      const nodeEnd = charOffset + node.text.length
      charOffset = nodeEnd

      if (replaced) {
        // Nodes after the replacement that were part of the old text: empty them
        if (nodeStart < pos + oldText.length && nodeEnd > pos) {
          const emptyNode = node.match.replace(node.text, '')
          result = result.replace(node.match, emptyNode)
        }
        continue
      }

      if (nodeStart <= pos && nodeEnd > pos) {
        // This node contains the start of the match
        const before = node.text.slice(0, pos - nodeStart)
        const afterEnd = pos + oldText.length - nodeStart
        const after = afterEnd <= node.text.length ? node.text.slice(afterEnd) : ''
        const newNodeText = before + escapeXml(newText) + after
        const newNode = node.match.replace(node.text, newNodeText)
        result = result.replace(node.match, newNode)
        replaced = true

        // If the old text fits entirely within this node, we're done
        if (afterEnd <= node.text.length) continue

        // Otherwise, we need to empty subsequent nodes
      }
    }

    return result
  })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── PDF → DOCX generation ─────────────────────────────────────────────

const SECTION_HEADERS = /^(professional\s+)?summary$|^(work\s+)?experience$|^education|^(technical\s+)?skills$|^core\s+competencies$|^objective$/i
const BULLET_PREFIX = /^[•\-\*]\s*/

export async function createDocxFromText(
  text: string,
  replacements: TextReplacement[]
): Promise<Buffer> {
  let adapted = text
  for (const { old: oldText, new: newText } of replacements) {
    adapted = adapted.replace(oldText, newText)
  }

  const lines = adapted.split('\n').filter((l) => l.trim().length > 0)
  const paragraphs: Paragraph[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (i === 0) {
      // First line is the name
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 28, font: 'Calibri' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      )
    } else if (SECTION_HEADERS.test(line)) {
      paragraphs.push(
        new Paragraph({
          text: line.toUpperCase(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          border: { bottom: { color: '000000', space: 1, size: 6, style: 'single' as const } },
        })
      )
    } else if (BULLET_PREFIX.test(line)) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: line.replace(BULLET_PREFIX, ''), size: 20, font: 'Calibri' }),
          ],
          bullet: { level: 0 },
          spacing: { after: 40 },
        })
      )
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 20, font: 'Calibri' })],
          spacing: { after: 60 },
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children: paragraphs }],
  })

  const buf = await Packer.toBuffer(doc)
  return Buffer.from(buf)
}
