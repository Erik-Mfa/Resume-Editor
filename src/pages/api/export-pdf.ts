import type { NextApiRequest, NextApiResponse } from 'next'
import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { ResumePdfDocument } from '@/components/ResumePdfDocument'
import { isResumeData } from '@/lib/resumeSchema'

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  const resumeData = (req.body as Record<string, unknown>)?.data
  if (!isResumeData(resumeData)) {
    return res.status(400).json({ error: 'Invalid resume data.' })
  }

  try {
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(ResumePdfDocument, { resumeData }) as any
    )
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="adapted-resume.pdf"')
    res.status(200).send(Buffer.from(pdfBuffer))
  } catch (err) {
    console.error('PDF render error:', err)
    res.status(500).json({ error: 'Failed to generate PDF.' })
  }
}
