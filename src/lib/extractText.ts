import mammoth from 'mammoth'

export interface ExtractedDocument {
  text: string
  fileType: 'pdf' | 'docx'
  buffer: Buffer
}

export async function extractText(file: File): Promise<ExtractedDocument> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.name.endsWith('.docx')

  if (isPdf) {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return { text: result.text, fileType: 'pdf', buffer }
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer })
    return { text: result.value, fileType: 'docx', buffer }
  }

  throw new Error('Unsupported file type. Please upload a PDF or .docx file.')
}
