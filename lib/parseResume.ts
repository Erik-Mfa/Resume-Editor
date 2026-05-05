import mammoth from 'mammoth'
import type { ResumeData, ExperienceEntry } from './resumeSchema'

export async function parseResume(file: File): Promise<ResumeData> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const type = file.type
  let text: string

  if (type === 'application/pdf' || file.name.endsWith('.pdf')) {
    // Dynamic import avoids pdf-parse reading test fixtures at module load time
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    text = result.text
  } else if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer })
    text = result.value
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or .docx file.')
  }

  return extractStructure(text)
}

function extractStructure(text: string): ResumeData {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const personalInfo = extractPersonalInfo(lines)
  const sections = splitIntoSections(lines)

  return {
    personalInfo,
    summary: sections.summary,
    experience: sections.experience,
    education: sections.education,
    skills: sections.skills,
  }
}

function extractPersonalInfo(lines: string[]) {
  const emailRegex = /[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i
  const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4,6}/
  const linkedinRegex = /linkedin\.com\/in\/[\w\-]+/i

  let name = ''
  let email = ''
  let phone = ''
  let linkedin = ''

  const header = lines.slice(0, 8)

  for (const line of header) {
    if (!email && emailRegex.test(line)) {
      email = line.match(emailRegex)![0]
    }
    if (!phone && phoneRegex.test(line)) {
      phone = line.match(phoneRegex)![0]
    }
    if (!linkedin && linkedinRegex.test(line)) {
      const match = line.match(linkedinRegex)
      linkedin = match ? `https://${match[0]}` : ''
    }
  }

  // Name is the first line that isn't contact data
  for (const line of header) {
    if (
      !emailRegex.test(line) &&
      !phoneRegex.test(line) &&
      !linkedinRegex.test(line) &&
      line.length > 2
    ) {
      name = line
      break
    }
  }

  return { name, email, phone, linkedin }
}

const SECTION_PATTERNS = {
  summary: /^(professional\s+)?summary$|^objective$/i,
  experience: /^(work\s+)?experience$|^employment(\s+history)?$/i,
  education: /^education(\s+&\s+training)?$/i,
  skills: /^(technical\s+)?skills$|^core\s+competencies$/i,
}

type SectionKey = keyof typeof SECTION_PATTERNS

function splitIntoSections(lines: string[]) {
  let currentSection: SectionKey | null = null
  const sectionLines: Record<SectionKey, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
  }

  for (const line of lines) {
    let matched = false
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS) as [SectionKey, RegExp][]) {
      if (pattern.test(line)) {
        currentSection = key
        matched = true
        break
      }
    }
    if (!matched && currentSection) {
      sectionLines[currentSection].push(line)
    }
  }

  return {
    summary: sectionLines.summary.join(' ').trim(),
    experience: parseExperience(sectionLines.experience),
    education: parseEducation(sectionLines.education),
    skills: parseSkills(sectionLines.skills),
  }
}

const DATE_PATTERN =
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+\d{4}|\d{4}\s*[–\-]\s*(\d{4}|present|current)/i

function parseExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = []
  let current: Partial<ExperienceEntry> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (DATE_PATTERN.test(line)) {
      if (current) entries.push(finalizeEntry(current))
      // Dates line found — role/company should be in the 1-2 preceding lines
      const role = i >= 1 ? lines[i - 1] : ''
      const company = i >= 2 && !DATE_PATTERN.test(lines[i - 2]) ? lines[i - 2] : ''
      current = { company, role, dates: line, bullets: [] }
    } else if (current && /^[•\-\*]/.test(line)) {
      const bullet = line.replace(/^[•\-\*]\s*/, '').trim()
      if (bullet) current.bullets = [...(current.bullets ?? []), bullet]
    }
  }

  if (current) entries.push(finalizeEntry(current))
  return entries
}

function finalizeEntry(e: Partial<ExperienceEntry>): ExperienceEntry {
  return {
    company: e.company ?? '',
    role: e.role ?? '',
    dates: e.dates ?? '',
    bullets: e.bullets ?? [],
  }
}

function parseEducation(lines: string[]) {
  const entries: { institution: string; degree: string; dates: string }[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (DATE_PATTERN.test(line)) {
      const degree = i >= 1 ? lines[i - 1] : ''
      const institution = i >= 2 ? lines[i - 2] : ''
      entries.push({ institution, degree, dates: line })
    }
    i++
  }

  return entries
}

function parseSkills(lines: string[]): string[] {
  return lines
    .flatMap((l) => l.split(/[,;|•]/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
