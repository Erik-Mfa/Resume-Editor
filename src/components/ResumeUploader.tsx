'use client'

import { useState, useRef } from 'react'

type Step = 'upload' | 'processing' | 'done'

export function ResumeUploader() {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [wasPdf, setWasPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setResumeFile(file)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!resumeFile) {
      setError('Please select a resume file.')
      return
    }
    if (!jobDescription.trim()) {
      setError('Please enter a job description.')
      return
    }

    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('jobDescription', jobDescription.trim())

    setIsLoading(true)
    setStep('processing')
    setWasPdf(resumeFile.name.endsWith('.pdf') || resumeFile.type === 'application/pdf')

    try {
      const res = await fetch('/api/transform-resume', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'Unexpected error. Please try again.')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('upload')
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload() {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = 'adapted-resume.docx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleReset() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    setStep('upload')
    setDownloadUrl(null)
    setResumeFile(null)
    setJobDescription('')
    setError(null)
    setWasPdf(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
          <span className="mt-0.5 shrink-0">&#9888;</span>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto shrink-0 text-red-500 hover:text-red-700"
            aria-label="Dismiss"
          >
            &#10005;
          </button>
        </div>
      )}

      {step === 'done' && downloadUrl ? (
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">
              &#10003;
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Resume adapted successfully</h2>
            <p className="text-sm text-gray-500">
              Your professional summary and experience bullets have been tailored to the job
              description. All other information is unchanged.
            </p>
            {wasPdf && (
              <p className="text-xs text-amber-600">
                Your PDF was adapted and saved as a DOCX to preserve quality.
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Download DOCX
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume <span className="text-gray-400 font-normal">(PDF or .docx)</span>
            </label>
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {resumeFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-800">{resumeFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(resumeFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setResumeFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PDF or DOCX up to 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Job description */}
          <div>
            <label
              htmlFor="jobDescription"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Job Description
            </label>
            <textarea
              id="jobDescription"
              rows={8}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here. The AI will adapt your summary and bullet points to match this role."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Adapting resume…
              </>
            ) : (
              'Adapt Resume'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
