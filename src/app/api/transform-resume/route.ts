import { parseResume } from '@/lib/parseResume'
import { adaptResume } from '@/lib/genAi'
import { detectFont } from '@/lib/detectFont'

export const maxDuration = 60

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

  let parsedResume
  try {
    const arrayBuffer = await resumeFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    parsedResume = await parseResume(resumeFile)
    parsedResume.fontFamily = detectFont(buffer)
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Could not parse the resume file.',
      },
      { status: 422 }
    )
  }

  let adaptedResume
  try {
    adaptedResume = await adaptResume(parsedResume, jobDescription.trim())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI service error.'
    if (message.includes('integrity violation')) {
      return Response.json(
        { success: false, error: 'AI attempted to modify protected fields. Please retry.' },
        { status: 502 }
      )
    }
    return Response.json(
      { success: false, error: message },
      { status: 502 }
    )
  }

  return Response.json({ success: true, data: adaptedResume })
}
