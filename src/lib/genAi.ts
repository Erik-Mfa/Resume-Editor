import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ResumeData, ExperienceEntry, EducationEntry } from './resumeSchema'
import { isResumeData } from './resumeSchema'

const SYSTEM_INSTRUCTION = `You are a professional resume adaptation assistant with strict integrity constraints.

ABSOLUTE RULES — any violation makes your response invalid:
1. DO NOT invent, fabricate, or hallucinate any information not present in the original resume JSON.
2. DO NOT add, modify, or remove: personalInfo fields, company names, job titles (role field), employment dates, institution names, degree names, or skills.
3. DO NOT add new experience entries or education entries. DO NOT remove existing ones.
4. YOU MAY ONLY change two things:
   a. The top-level "summary" string — rephrase it to better align with the target job description.
   b. The "bullets" array in each experience entry — reword existing bullets to highlight relevance to the job description. You MUST keep the exact same number of bullets per entry.
5. Return ONLY a valid JSON object. No markdown. No code fences. No explanation text. No trailing text after the closing brace.
6. The returned JSON must exactly match this TypeScript schema:
   {
     "personalInfo": { "name": string, "email": string, "phone": string, "linkedin": string },
     "summary": string,
     "experience": Array<{ "company": string, "role": string, "dates": string, "bullets": string[] }>,
     "education": Array<{ "institution": string, "degree": string, "dates": string }>,
     "skills": string[]
   }`

function buildUserMessage(originalResume: ResumeData, jobDescription: string): string {
  return `ORIGINAL RESUME JSON:
${JSON.stringify(originalResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription}

Adapt the resume following the strict rules above. Return only the modified JSON object.`
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

function checkIntegrity(original: ResumeData, adapted: ResumeData): void {
  const pi = original.personalInfo
  const api = adapted.personalInfo
  if (
    pi.name !== api.name ||
    pi.email !== api.email ||
    pi.phone !== api.phone ||
    pi.linkedin !== api.linkedin
  ) {
    throw new Error('AI integrity violation: personalInfo fields were modified.')
  }

  if (original.experience.length !== adapted.experience.length) {
    throw new Error('AI integrity violation: experience entry count changed.')
  }
  original.experience.forEach((orig: ExperienceEntry, i: number) => {
    const ad = adapted.experience[i]
    if (orig.company !== ad.company || orig.role !== ad.role || orig.dates !== ad.dates) {
      throw new Error(
        `AI integrity violation: protected fields changed in experience[${i}].`
      )
    }
    if (orig.bullets.length !== ad.bullets.length) {
      throw new Error(
        `AI integrity violation: bullet count changed in experience[${i}].`
      )
    }
  })

  if (original.education.length !== adapted.education.length) {
    throw new Error('AI integrity violation: education entry count changed.')
  }
  original.education.forEach((orig: EducationEntry, i: number) => {
    const ad = adapted.education[i]
    if (
      orig.institution !== ad.institution ||
      orig.degree !== ad.degree ||
      orig.dates !== ad.dates
    ) {
      throw new Error(
        `AI integrity violation: protected fields changed in education[${i}].`
      )
    }
  })
}

let _client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY environment variable is not set.')
    }
    _client = new GoogleGenerativeAI(apiKey)
  }
  return _client
}

export async function adaptResume(
  originalResume: ResumeData,
  jobDescription: string
): Promise<ResumeData> {
  const client = getClient()
  const userMessage = buildUserMessage(originalResume, jobDescription)

  let responseText: string
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const response = await model.generateContent({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: userMessage,
            },
          ],
        },
      ],
    })

    responseText = response.response.text() ?? ''
    if (!responseText) {
      throw new Error('No text returned from Gemini API.')
    }
  } catch (err) {
    throw new Error(
      `[Gemini Error] ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const cleaned = stripMarkdownFences(responseText)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('[Gemini Error] AI returned invalid JSON. Please retry.')
  }

  if (!isResumeData(parsed)) {
    throw new Error('[Gemini Error] AI response does not match expected schema.')
  }

  checkIntegrity(originalResume, parsed)

  return parsed
}
