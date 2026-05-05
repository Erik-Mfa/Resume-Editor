export interface PersonalInfo {
  name: string
  email: string
  phone: string
  linkedin: string
}

export interface ExperienceEntry {
  company: string
  role: string
  dates: string
  bullets: string[]
}

export interface EducationEntry {
  institution: string
  degree: string
  dates: string
}

export interface ResumeData {
  personalInfo: PersonalInfo
  summary: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: string[]
}

export function isResumeData(obj: unknown): obj is ResumeData {
  if (typeof obj !== 'object' || obj === null) return false
  const r = obj as Record<string, unknown>

  if (typeof r.personalInfo !== 'object' || r.personalInfo === null) return false
  const pi = r.personalInfo as Record<string, unknown>
  if (typeof pi.name !== 'string') return false
  if (typeof pi.email !== 'string') return false
  if (typeof pi.phone !== 'string') return false
  if (typeof pi.linkedin !== 'string') return false

  if (typeof r.summary !== 'string') return false

  if (!Array.isArray(r.experience)) return false
  for (const entry of r.experience) {
    if (typeof entry !== 'object' || entry === null) return false
    const e = entry as Record<string, unknown>
    if (typeof e.company !== 'string') return false
    if (typeof e.role !== 'string') return false
    if (typeof e.dates !== 'string') return false
    if (!Array.isArray(e.bullets) || !e.bullets.every((b) => typeof b === 'string')) return false
  }

  if (!Array.isArray(r.education)) return false
  for (const entry of r.education) {
    if (typeof entry !== 'object' || entry === null) return false
    const e = entry as Record<string, unknown>
    if (typeof e.institution !== 'string') return false
    if (typeof e.degree !== 'string') return false
    if (typeof e.dates !== 'string') return false
  }

  if (!Array.isArray(r.skills) || !r.skills.every((s) => typeof s === 'string')) return false

  return true
}
