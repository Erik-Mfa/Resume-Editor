import mammoth from 'mammoth'
import type { ResumeData, ExperienceEntry } from './resumeSchema'

export async function parseResume(file: File): Promise<ResumeData> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const type = file.type
  let text: string

  if (type === 'application/pdf' || file.name.endsWith('.pdf')) {
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
  const githubRegex = /github\.com\/[\w\-]+/i
  const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.(?:com|io|dev|app|co|net|org))\b/i
  const addressRegex = /•?\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*,\s*[A-Z]{2}(?:\s*,\s*[A-Z]\.[A-Z]\.?)?)\s*•?/

  let name = '', email = '', phone = '', linkedin = '', github = '', website = '', address = ''

  const header = lines.slice(0, 10)

  for (const line of header) {
    if (!email && emailRegex.test(line)) email = line.match(emailRegex)![0]
    if (!phone && phoneRegex.test(line)) phone = line.match(phoneRegex)![0]
    if (!linkedin && linkedinRegex.test(line)) {
      const match = line.match(linkedinRegex)
      linkedin = match ? `https://${match[0]}` : ''
    }
    if (!github && githubRegex.test(line)) {
      const match = line.match(githubRegex)
      github = match ? match[0] : ''
    }
    if (!address && addressRegex.test(line)) {
      const match = line.match(addressRegex)
      address = match ? match[1].trim() : ''
    }
  }

  for (const line of header) {
    if (!website && websiteRegex.test(line) && !linkedinRegex.test(line) && !githubRegex.test(line) && !emailRegex.test(line)) {
      const match = line.match(websiteRegex)
      if (match) website = match[0].replace(/^https?:\/\//, '')
    }
  }

  for (const line of header) {
    if (!emailRegex.test(line) && !phoneRegex.test(line) && !linkedinRegex.test(line) && !githubRegex.test(line) && line.length > 2) {
      name = line
      break
    }
  }

  return { name, email, phone, linkedin, ...(address && { address }), ...(website && { website }), ...(github && { github }) }
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
  const sectionLines: Record<SectionKey, string[]> = { summary: [], experience: [], education: [], skills: [] }

  for (const line of lines) {
    let matched = false
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS) as [SectionKey, RegExp][]) {
      if (pattern.test(line)) { currentSection = key; matched = true; break }
    }
    if (!matched && currentSection) sectionLines[currentSection].push(line)
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

// Keywords that indicate a line is a degree, not a geographic location
const DEGREE_WORDS = /certif|bachelor|master|associate|science|arts|engineering|technology|degree|systems|analysis|development|information/i

// Splits "COMPANY NAME  Location, Country" → { company, location }
// Location must be a short geographic string, not a degree title.
function splitCompanyLocation(line: string): { company: string; location: string } {
  const match =
    line.match(/^([A-ZÁÉÍÓÚ\s&,\.]+?)\s{2,}([A-Z][a-z].+)$/) ||
    line.match(/^([A-Z][A-Z\s&,\.]{2,}?)\s+([A-Z][a-z].+)$/)
  if (match) {
    const loc = match[2].trim()
    // Reject if it looks like a degree title or is too long to be a location
    if (loc.length <= 40 && !DEGREE_WORDS.test(loc)) {
      return { company: match[1].trim(), location: loc }
    }
  }
  return { company: line.trim(), location: '' }
}

function isBulletLine(line: string) { return /^[•\-\*]/.test(line) }

function parseExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = []
  let current: Partial<ExperienceEntry> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const dateMatch = line.match(DATE_PATTERN)

    if (dateMatch) {
      if (current) entries.push(finalizeEntry(current))

      const dateStr = dateMatch[0]
      // The role may share a line with the date — strip the date to get the role prefix
      const roleFromSameLine = line.replace(DATE_PATTERN, '').trim()

      let role: string
      let companyLine: string

      if (roleFromSameLine) {
        // "Associate Software Engineer Mar 2025 – Aug 2025"
        role = roleFromSameLine
        companyLine =
          i >= 1 && !DATE_PATTERN.test(lines[i - 1]) && !isBulletLine(lines[i - 1])
            ? lines[i - 1]
            : ''
      } else {
        // Date on its own line
        role = i >= 1 && !isBulletLine(lines[i - 1]) ? lines[i - 1] : ''
        companyLine =
          i >= 2 && !DATE_PATTERN.test(lines[i - 2]) && !isBulletLine(lines[i - 2])
            ? lines[i - 2]
            : ''
      }

      const { company, location } = splitCompanyLocation(companyLine)
      current = { company, role, dates: dateStr, location: location || undefined, bullets: [] }
    } else if (current && isBulletLine(line)) {
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
    ...(e.location && { location: e.location }),
  }
}

function parseEducation(lines: string[]) {
  const entries: { institution: string; degree: string; dates: string; location?: string }[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const dateMatch = line.match(DATE_PATTERN)
    if (dateMatch) {
      const dateStr = dateMatch[0]
      // Degree may share the line with the date (e.g. "Certificate IV in IT 2023 - 2024")
      const degreeFromSameLine = line.replace(DATE_PATTERN, '').trim()

      let degree: string
      let institutionLine: string

      if (degreeFromSameLine) {
        degree = degreeFromSameLine
        institutionLine = i >= 1 ? lines[i - 1] : ''
      } else {
        degree = i >= 1 ? lines[i - 1] : ''
        institutionLine = i >= 2 ? lines[i - 2] : ''
      }

      const { company: institution, location } = splitCompanyLocation(institutionLine)
      if (institution) {
        entries.push({ institution, degree, dates: dateStr, ...(location && { location }) })
      }
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
