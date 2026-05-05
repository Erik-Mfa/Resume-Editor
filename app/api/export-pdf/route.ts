import { createElement } from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { ResumePdfDocument } from '@/components/ResumePdfDocument'
import { isResumeData } from '@/lib/resumeSchema'

export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const resumeData = (body as Record<string, unknown>)?.data
  if (!isResumeData(resumeData)) {
    return Response.json({ error: 'Invalid resume data.' }, { status: 400 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderToBuffer(
      createElement(ResumePdfDocument, { resumeData }) as ReactElement<DocumentProps>
    )
  } catch (err) {
    console.error('PDF render error:', err)
    return Response.json({ error: 'Failed to generate PDF.' }, { status: 500 })
  }

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="adapted-resume.pdf"',
    },
  })
}
