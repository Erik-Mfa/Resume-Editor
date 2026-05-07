import { ResumeUploader } from '@/components/ResumeUploader'

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Pivot AI</h1>
          <p className="text-gray-600 leading-relaxed">
            Upload your resume and paste a job description. Gemini will adapt your professional
            summary and experience bullets to match the role — without inventing new jobs,
            companies, or credentials.
          </p>
        </div>
        <ResumeUploader />
        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by Google Vertex AI
        </p>
      </div>
    </main>
  )
}
