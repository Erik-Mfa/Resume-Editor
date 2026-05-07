import { extractText } from '@/lib/extractText'
import { getReplacements } from '@/lib/genAi'
import { applyToDocx, createDocxFromText } from '@/lib/applyReplacements'

export const maxDuration = 60

const DOCX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function POST(request: Request): Promise<Response> {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { success: false, error: 'Could not parse form data.' },
      { status: 400 }
    )
  }

  const resumeFile = formData.get('resume')
  const jobDescription = formData.get('jobDescription')

  if (!resumeFile || !(resumeFile instanceof File)) {
    return Response.json(
      { success: false, error: 'Please upload a resume file.' },
      { status: 400 }
    )
  }

  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    return Response.json(
      { success: false, error: 'Job description is required.' },
      { status: 400 }
    )
  }

  if (resumeFile.size > 10 * 1024 * 1024) {
    return Response.json(
      { success: false, error: 'File must be under 10MB.' },
      { status: 400 }
    )
  }

  let extracted
  try {
    extracted = await extractText(resumeFile)
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Could not parse the resume file.',
      },
      { status: 422 }
    )
  }

  let replacements
  try {
    replacements = await getReplacements(extracted.text, jobDescription.trim())
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'AI service error.',
      },
      { status: 502 }
    )
  }

  let outputBuffer: Buffer
  try {
    if (extracted.fileType === 'docx') {
      outputBuffer = await applyToDocx(extracted.buffer, replacements)
    } else {
      outputBuffer = await createDocxFromText(extracted.text, replacements)
    }
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate document.',
      },
      { status: 500 }
    )
  }

  return new Response(new Uint8Array(outputBuffer), {
    headers: {
      'Content-Type': DOCX_CONTENT_TYPE,
      'Content-Disposition': 'attachment; filename="adapted-resume.docx"',
    },
  })
}
