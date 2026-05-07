export interface EducationEntry {
  school: string
  location?: string
  degree: string
  dates?: string
}

export interface ExperienceEntry {
  company: string
  location?: string
  title: string
  dates?: string
  bullets: string[]
}

export interface ExtraSection {
  heading: string
  bullets: string[]
}

export interface ResumeSchema {
  name: string
  contact: { line1: string; line2?: string }
  summary: string
  education: EducationEntry[]
  experience: ExperienceEntry[]
  skills: string[]
  extras?: ExtraSection[]
}

function isString(v: unknown): v is string {
  return typeof v === 'string'
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString)
}

export function validateResumeSchema(value: unknown): ResumeSchema {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Resume schema must be an object.')
  }
  const v = value as Record<string, unknown>

  if (!isString(v.name) || v.name.trim().length === 0) {
    throw new Error('Schema "name" must be a non-empty string.')
  }
  if (typeof v.contact !== 'object' || v.contact === null) {
    throw new Error('Schema "contact" must be an object.')
  }
  const contact = v.contact as Record<string, unknown>
  if (!isString(contact.line1)) {
    throw new Error('Schema "contact.line1" must be a string.')
  }
  if (contact.line2 !== undefined && !isString(contact.line2)) {
    throw new Error('Schema "contact.line2" must be a string when present.')
  }
  if (!isString(v.summary)) {
    throw new Error('Schema "summary" must be a string.')
  }
  if (!Array.isArray(v.education)) {
    throw new Error('Schema "education" must be an array.')
  }
  for (const e of v.education) {
    if (typeof e !== 'object' || e === null) throw new Error('Education entry must be an object.')
    const ed = e as Record<string, unknown>
    if (!isString(ed.school) || !isString(ed.degree)) {
      throw new Error('Education entry requires string "school" and "degree".')
    }
    if (ed.location !== undefined && !isString(ed.location)) {
      throw new Error('Education "location" must be a string when present.')
    }
    if (ed.dates !== undefined && !isString(ed.dates)) {
      throw new Error('Education "dates" must be a string when present.')
    }
  }
  if (!Array.isArray(v.experience)) {
    throw new Error('Schema "experience" must be an array.')
  }
  for (const e of v.experience) {
    if (typeof e !== 'object' || e === null) throw new Error('Experience entry must be an object.')
    const ex = e as Record<string, unknown>
    if (!isString(ex.company) || !isString(ex.title)) {
      throw new Error('Experience entry requires string "company" and "title".')
    }
    if (!isStringArray(ex.bullets)) {
      throw new Error('Experience "bullets" must be an array of strings.')
    }
    if (ex.location !== undefined && !isString(ex.location)) {
      throw new Error('Experience "location" must be a string when present.')
    }
    if (ex.dates !== undefined && !isString(ex.dates)) {
      throw new Error('Experience "dates" must be a string when present.')
    }
  }
  if (!isStringArray(v.skills)) {
    throw new Error('Schema "skills" must be an array of strings.')
  }
  if (v.extras !== undefined) {
    if (!Array.isArray(v.extras)) {
      throw new Error('Schema "extras" must be an array when present.')
    }
    for (const x of v.extras) {
      if (typeof x !== 'object' || x === null) throw new Error('Extra section must be an object.')
      const xs = x as Record<string, unknown>
      if (!isString(xs.heading) || !isStringArray(xs.bullets)) {
        throw new Error('Extra section requires string "heading" and string-array "bullets".')
      }
    }
  }

  return value as ResumeSchema
}
