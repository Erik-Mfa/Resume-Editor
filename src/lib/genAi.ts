import { GoogleGenAI } from '@google/genai'

export interface TextReplacement {
  old: string
  new: string
}

const SYSTEM_INSTRUCTION = `You are a professional resume adaptation assistant.

You will receive the full raw text of a resume and a target job description.
Your task: identify the professional summary and experience bullet points, then reword them to better align with the job description.

RULES:
1. Return a JSON array of replacement pairs: [{ "old": "exact original text", "new": "reworded text" }]
2. Each "old" value MUST be a verbatim, exact substring copied from the original resume text. It must be long enough to be unique within the document.
3. You may ONLY reword:
   a. The professional summary paragraph.
   b. Experience bullet points (lines that start with bullet characters like •, -, *).
4. DO NOT change: names, contact info, company names, job titles, dates, education, skills, or any other content.
5. Keep the same number of bullet points per job entry.
6. Each bullet must remain under 120 characters.
7. Do NOT append explanatory phrases like "demonstrating...", "indicating...", "highlighting...", or "showcasing...".
8. Return ONLY the JSON array. No markdown fences. No explanation. No trailing text.`

function buildUserMessage(resumeText: string, jobDescription: string): string {
  return `ORIGINAL RESUME TEXT:
${resumeText}

TARGET JOB DESCRIPTION:
${jobDescription}

Return the JSON array of replacement pairs following the rules above.`
}

function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
}

function validateReplacements(resumeText: string, replacements: unknown): TextReplacement[] {
  if (!Array.isArray(replacements)) {
    throw new Error('AI response is not an array.')
  }

  for (const item of replacements) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.old !== 'string' ||
      typeof item.new !== 'string'
    ) {
      throw new Error('Each replacement must have "old" and "new" string fields.')
    }
    if (!resumeText.includes(item.old)) {
      throw new Error(`Replacement "old" text not found in original resume: "${item.old.slice(0, 60)}..."`)
    }
  }

  return replacements as TextReplacement[]
}

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION ?? 'us-central1',
    })
  }
  return _client
}

export async function getReplacements(
  resumeText: string,
  jobDescription: string
): Promise<TextReplacement[]> {
  const client = getClient()
  const userMessage = buildUserMessage(resumeText, jobDescription)

  let responseText: string
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: SYSTEM_INSTRUCTION },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    })

    responseText = response.text ?? ''
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

  return validateReplacements(resumeText, parsed)
}
