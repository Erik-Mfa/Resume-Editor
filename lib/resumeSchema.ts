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
  if (typeof r.summary !== 'string') return false
  if (!Array.isArray(r.experience)) return false
  if (!Array.isArray(r.education)) return false
  if (!Array.isArray(r.skills)) return false
  return true
}
