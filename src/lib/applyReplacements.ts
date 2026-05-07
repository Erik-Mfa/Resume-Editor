import JSZip from 'jszip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  BorderStyle,
} from 'docx'
import type { TextReplacement } from './genAi'
import type { ResumeSchema } from './resumeSchema'

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

// ── Standard-layout DOCX rendering (used for non-DOCX inputs) ─────────

const HEADING_FONT = 'Georgia'
const FONT = 'Calibri'
const RIGHT_TAB = 10800 // text area width: 12240 (letter) - 720 left - 720 right margins

const BODY_SIZE = 20
const NAME_SIZE = 28
const HEADING_SIZE = 22

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: HEADING_SIZE, font: HEADING_FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { color: '000000', space: 1, size: 6, style: BorderStyle.SINGLE },
    },
  })
}

function leftRightLine(
  left: { text: string; bold?: boolean; italic?: boolean; caps?: boolean },
  right?: { text: string; bold?: boolean; italic?: boolean },
  spacingAfter = 0
): Paragraph {
  const children = [
    new TextRun({
      text: left.caps ? left.text.toUpperCase() : left.text,
      bold: left.bold,
      italics: left.italic,
      size: BODY_SIZE,
      font: FONT,
    }),
  ]
  if (right && right.text) {
    children.push(new TextRun({ text: '\t', size: BODY_SIZE, font: FONT }))
    children.push(
      new TextRun({
        text: right.text,
        bold: right.bold,
        italics: right.italic,
        size: BODY_SIZE,
        font: FONT,
      })
    )
  }
  return new Paragraph({
    children,
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { after: spacingAfter },
  })
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: FONT })],
    bullet: { level: 0 },
    spacing: { after: 20 },
  })
}

export async function renderStandardDocx(schema: ResumeSchema): Promise<Buffer> {
  const paragraphs: Paragraph[] = []

  // Header — name
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: schema.name, bold: true, size: NAME_SIZE, font: HEADING_FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 80 },
    })
  )

  // Header — contact lines
  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: `• ${schema.contact.line1} •`, size: BODY_SIZE, font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: schema.contact.line2 ? 0 : 60 },
    })
  )
  if (schema.contact.line2) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: `• ${schema.contact.line2} •`, size: BODY_SIZE, font: FONT })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      })
    )
  }

  // Summary
  if (schema.summary && schema.summary.trim().length > 0) {
    paragraphs.push(sectionHeading('Professional summary'))
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: schema.summary, size: BODY_SIZE, font: FONT })],
        spacing: { after: 60 },
      })
    )
  }

  // Education
  if (schema.education.length > 0) {
    paragraphs.push(sectionHeading('Education'))
    schema.education.forEach((ed, idx) => {
      paragraphs.push(
        leftRightLine(
          { text: ed.school, bold: true, caps: true },
          ed.location ? { text: ed.location, italic: true } : undefined
        )
      )
      paragraphs.push(
        leftRightLine(
          { text: ed.degree, bold: true },
          ed.dates ? { text: ed.dates, italic: true } : undefined
        )
      )
      if (idx < schema.education.length - 1) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '', size: 8, font: FONT })],
            spacing: { after: 0 },
          })
        )
      }
    })
  }

  // Experience
  if (schema.experience.length > 0) {
    paragraphs.push(sectionHeading('Experience'))
    schema.experience.forEach((ex, idx) => {
      paragraphs.push(
        leftRightLine(
          { text: ex.company, bold: true, caps: true },
          ex.location ? { text: ex.location, italic: true } : undefined
        )
      )
      paragraphs.push(
        leftRightLine(
          { text: ex.title, bold: true },
          ex.dates ? { text: ex.dates, italic: true } : undefined,
          60
        )
      )
      for (const b of ex.bullets) {
        paragraphs.push(bulletParagraph(b))
      }
      if (idx < schema.experience.length - 1) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '', size: 8, font: FONT })],
            spacing: { after: 80 },
          })
        )
      }
    })
  }

  // Skills
  if (schema.skills.length > 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: '', font: FONT })], spacing: { after: 100 } }))
    paragraphs.push(sectionHeading('Skills'))
    const mid = Math.ceil(schema.skills.length / 2)
    const toLine = (arr: string[]) => arr.map((s) => `• ${s}`).join(' ')
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: toLine(schema.skills.slice(0, mid)), size: BODY_SIZE, font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 4 },
    }))
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: toLine(schema.skills.slice(mid)), size: BODY_SIZE, font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }))
  }

  // Extras
  if (schema.extras) {
    for (const extra of schema.extras) {
      if (extra.bullets.length === 0) continue
      paragraphs.push(sectionHeading(extra.heading))
      for (const b of extra.bullets) {
        paragraphs.push(bulletParagraph(b))
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: BODY_SIZE } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: paragraphs,
      },
    ],
  })

  const buf = await Packer.toBuffer(doc)
  return Buffer.from(buf)
}
