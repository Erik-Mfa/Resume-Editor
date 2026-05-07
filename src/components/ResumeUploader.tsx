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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setResumeFile(file)
    setError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0] ?? null
    if (file) {
      setResumeFile(file)
      setError(null)
    }
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
      {/* Card header bar */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

      <div className="p-8">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 text-red-400 hover:text-red-200 transition-colors" aria-label="Dismiss">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        )}

        {/* Processing state */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Adapting your resume…</p>
              <p className="text-slate-400 text-sm mt-1">Gemini is tailoring your content to the role</p>
            </div>
          </div>
        )}

        {/* Success state */}
        {step === 'done' && downloadUrl && (
          <div className="flex flex-col items-center text-center py-10 gap-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Resume adapted</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-sm">
                Your summary and bullet points have been tailored to the job description. All other information is unchanged.
              </p>
              {wasPdf && (
                <p className="text-xs text-amber-400 mt-2">
                  Your PDF was converted to DOCX to preserve formatting quality.
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Download DOCX
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 hover:border-slate-500 px-6 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Upload form */}
        {step === 'upload' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Resume <span className="text-slate-500 font-normal">— PDF or DOCX</span>
              </label>
              <div
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : resumeFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {resumeFile ? (
                  <div className="space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-white">{resumeFile.name}</p>
                    <p className="text-xs text-slate-500">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setResumeFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-10 w-10 mx-auto rounded-lg bg-slate-700 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-slate-300">
                        <span className="text-indigo-400 font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF or DOCX — up to 10 MB</p>
                    </div>
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
              <label htmlFor="jobDescription" className="block text-sm font-medium text-slate-300 mb-2">
                Job Description
              </label>
              <textarea
                id="jobDescription"
                rows={8}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors scrollbar-thin"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3.5 text-sm font-semibold text-white transition-colors"
            >
              Adapt Resume
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
